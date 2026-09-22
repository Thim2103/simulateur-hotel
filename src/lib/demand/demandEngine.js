// The hotel's booking DEMAND model: how many new stays guests try to book
// each simulated day, and which of them the hotel can actually take.
// Before this module nothing in the codebase created reservations after
// the seed (revenue only ever depended on already-existing ones), so
// reputation, price and equipment problems had no lasting economic
// consequence; now they scale the flow of new bookings.
//
// Everything here is pure and DETERMINISTIC -- no `rng`: lib/events/ and
// lib/dailyCycle/'s tests pin exact outputs to a fixed `rng`, so a new
// random draw would shift that sequence. Variety (arrival lead time, stay
// length, channel, segment) comes from fixed rotating patterns instead,
// and fractional daily demand is carried over between days
// (`hotelState.demand.carry`) rather than rounded away or sampled.
//
// A day's demand multiplier is the product of six factors, each shown
// separately to the player (see describeDemand()):
//   reputation -- progression's reputation index (lib/progression/)
//   price      -- how the player's price level compares to what their
//                 standing justifies
//   season     -- month + weekday (no calendar existed before this)
//   events     -- still-active daily events (lib/events/), by the sign of
//                 their revenue impact
//   marketing  -- the targeted campaigns running today (lib/marketing/)
//   incidents  -- unrepaired equipment incidents (lib/maintenance/) cut
//                 the conversion rate on top of their reputation malus
import { safeArray, safeNumber, safeObject } from "../safe";
import { createReservation, findReservationConflicts } from "../pmsModels";
import { openIncidents } from "../maintenance/incidentImpact";
import { computeZoneEffects } from "../zones/zoneUpgradesEngine";
import { calendarEffects, seasonDemand } from "../hotelEvents/hotelEventsEngine";
import { computeCampaignEffects } from "../marketing/targetedCampaigns";
import { pendingDemandShift } from "../clients/guestReviewEngine";
import { isMeetingRoom } from "../mice/miceEngine";
import { mediaDemandFactor, reputationHoldOn } from "../mediaCrisis/mediaCrisisEngine";
import { proShareOn } from "../seasonEvents/seasonEventEngine";
import { programEffects } from "../loyalty/loyaltyProgramEngine";
import { spaDemandFactor } from "../expansion/majorProjectsEngine";
import { mixedRandom } from "../clients/guestProfiles";
import { createYieldPricer, summarizeYield, isYieldEnabled } from "../rm/yieldManagementEngine";

export const NEUTRAL_REPUTATION = 60;
export const MIN_MULTIPLIER = 0.3;
// Raised from 1.8 so that a +80 % event (lib/seasonEvents/) is still felt in high season.
export const MAX_MULTIPLIER = 2.2;

// New stays requested per room per day at multiplier 1. With the pattern
// average stay of ~2.25 nights, this settles around 65-70% occupancy.
export const BASE_ARRIVALS_PER_ROOM = 0.3;

// Price elasticity: a price level 10% above what the hotel's standing
// justifies costs ~8% of demand.
export const PRICE_ELASTICITY = 0.8;

const WEEKDAY_FACTOR = [1.0, 0.95, 0.95, 1.0, 1.0, 1.1, 1.1]; // Sun..Sat

export const INCIDENT_CONVERSION_MALUS = { minor: 0.02, moderate: 0.05, critical: 0.1 };
export const MAX_INCIDENT_MALUS = 0.3;
const REPAIRING_ATTENUATION = 0.5;

const EVENT_STEP = 0.05;
const MAX_EVENT_EFFECT = 0.15;

// Arrival lead time (days between booking and arrival), stay length,
// channel and segment rotate through fixed patterns.
const LEAD_PATTERN = [0, 1, 1, 2, 3, 2, 5, 1];
const STAY_PATTERN = [1, 2, 3, 2, 4, 2, 3, 1];
const CHANNEL_PATTERN = ["direct", "ota", "direct", "direct", "ota"];
const SEGMENT_PATTERN = ["leisure", "business", "leisure", "leisure"];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toDateOnly(value) {
  return String(value?.toISOString ? value.toISOString() : value || "").slice(0, 10);
}

function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * 86400000);
}

// The named season's demand (lib/hotelEvents/: high season +40 %, low
// season -30 %, marketing wins some of it back) times the weekday effect.
export function seasonFactor(referenceDate, hotelState) {
  const date = new Date(referenceDate);
  return seasonDemand(date, hotelState) * WEEKDAY_FACTOR[date.getUTCDay()];
}

export function reputationFactor(reputation) {
  return clamp(1 + (safeNumber(reputation, NEUTRAL_REPUTATION) - NEUTRAL_REPUTATION) * 0.008, 0.5, 1.4);
}

// How the player's price level compares to the rooms' own base rates:
// the mean of price/base-rate over stays still to come (1 = at base rate,
// 1.1 = the player raised prices 10%). Quick actions like "increase-prices"
// (lib/dashboard/dashboardActions.js) move exactly this.
export function priceIndex(rooms, reservations, referenceDate) {
  const today = toDateOnly(referenceDate);
  const baseByRoom = new Map(safeArray(rooms).map((room) => [Number(room.id), safeNumber(room.price, 0)]));
  const ratios = safeArray(reservations)
    .filter((reservation) => !String(reservation.status || "").toLowerCase().includes("annul") && toDateOnly(reservation.departure) >= today)
    .map((reservation) => {
      const base = baseByRoom.get(Number(reservation.room_id)) || 0;
      return base > 0 ? safeNumber(reservation.price, 0) / base : null;
    })
    .filter((ratio) => ratio !== null && ratio > 0);
  if (ratios.length === 0) return 1;
  return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
}

// A better-reputed hotel can justify (and gets away with) higher prices:
// the "fair" price level runs from 0.8x base at reputation 0 to 1.2x at 100.
//
// `standing` (0..0.3, from the zone upgrades the hotel has installed, see
// lib/zones/zoneUpgradesEngine.js) raises that fair level: a hotel that
// invested in quality can charge more without losing bookings.
// A club's Gold and Platinum members bite less at high prices (1 when there is no relief).
function relievedPrice(factor, relief) {
  return relief > 0 && factor < 1 ? 1 - (1 - factor) * (1 - relief) : factor;
}

export function priceFactor(index, reputation, standing = 0) {
  const fair = (0.8 + (clamp(safeNumber(reputation, NEUTRAL_REPUTATION), 0, 100) / 100) * 0.4) * (1 + Math.max(0, safeNumber(standing, 0)));
  return clamp(1 - (index / fair - 1) * PRICE_ELASTICITY, 0.5, 1.3);
}

export function eventFactor(activeEvents) {
  const effect = safeArray(activeEvents).reduce((sum, event) => {
    const revenue = safeNumber(event?.impact?.revenue, 0);
    return sum + (revenue > 0 ? EVENT_STEP : revenue < 0 ? -EVENT_STEP : 0);
  }, 0);
  return 1 + clamp(effect, -MAX_EVENT_EFFECT, MAX_EVENT_EFFECT);
}

export function incidentFactor(hotelState) {
  const malus = openIncidents(hotelState).reduce(
    (sum, incident) => sum + (INCIDENT_CONVERSION_MALUS[incident.severity] || 0) * (incident.status === "repairing" ? REPAIRING_ATTENUATION : 1),
    0
  );
  return 1 - Math.min(MAX_INCIDENT_MALUS, malus);
}

export function computeDemand({ hotelState, rooms, reservations, referenceDate = new Date() } = {}) {
  const state = safeObject(hotelState);
  // A media crisis holds the stored reputation down (lib/mediaCrisis/); its
  // effect on demand is its own `media` factor, so the hold is added back here.
  const storedReputation = safeNumber(state.progression?.player?.reputation, NEUTRAL_REPUTATION);
  const hold = reputationHoldOn(state, referenceDate);
  const reputation = hold > 0 ? Math.min(100, storedReputation + hold) : storedReputation;
  const index = priceIndex(rooms, reservations, referenceDate);
  // The loyalty club's members (lib/loyalty/): they come back, book direct and
  // put up with higher prices -- all of it inert without a club.
  const club = programEffects(state);
  // Scheduled events (festival, trade fair, heat wave...) and the season's
  // price tolerance come from the calendar (lib/hotelEvents/).
  const calendar = calendarEffects(referenceDate, state);
  // The targeted marketing campaigns running today (lib/marketing/).
  const campaigns = computeCampaignEffects(state, referenceDate);

  const factors = {
    // Yesterday's guest reviews (x3 for a V.I.P.) nudge it (lib/clients/guestReviewEngine.js).
    reputation: reputationFactor(reputation) * (1 + pendingDemandShift(state)),
    price: relievedPrice(priceFactor(index, reputation, computeZoneEffects(state).standing + calendar.priceTolerance), club.priceRelief),
    season: seasonFactor(referenceDate, state),
    events: eventFactor(state.progression?.activeEvents) * calendar.eventsDemandFactor,
    incidents: incidentFactor(state),
    marketing: campaigns.factor,
  };
  // A media crisis under way (or the rehabilitation campaign that follows one,
  // lib/mediaCrisis/) moves demand too -- a factor listed only when it does.
  const media = mediaDemandFactor(state, referenceDate);
  if (media !== 1) factors.media = media;
  if (club.returnBoost > 0) factors.loyalty = 1 + club.returnBoost;
  // A wellness area draws couples and leisure guests (lib/expansion/majorProjectsEngine.js).
  const spa = spaDemandFactor(state);
  if (spa !== 1) factors.spa = spa;
  const product = Object.values(factors).reduce((total, factor) => total * factor, 1);
  return { multiplier: clamp(product, MIN_MULTIPLIER, MAX_MULTIPLIER), factors, reputation, proShare: proShareOn(referenceDate), ...(club.active ? { loyalty: { share: club.directShare, members: club.pool } } : {}), priceIndex: index, premiumFirst: calendar.premiumFirst || campaigns.premiumFirst, segmentBias: campaigns.segmentBias, campaigns: campaigns.detail };
}

// Turns today's demand into concrete new reservations: each is assigned
// the first bookable room (rotating the starting point) that is free for
// its whole stay. A request no room can take is "turned away" -- lost
// demand the report surfaces. Priced at the room's base rate times the
// player's own price level, so raising prices also raises what new
// guests pay (and lowers how many come, see priceFactor()).
// Which rooms to try for a booking, in order: rotating through all of them
// (the starting point moves with `seq`), or, when high-end guests are in
// town (a festival, a trade fair), the deluxe rooms and suites first.
function candidateRooms(bookableRooms, seq, premiumFirst) {
  const rotate = (list) => list.map((_, offset) => list[(seq + offset) % list.length]);
  if (!premiumFirst) return rotate(bookableRooms);
  const isPremium = (room) => room.type === "deluxe" || room.type === "suite";
  return [...rotate(bookableRooms.filter(isPremium)), ...rotate(bookableRooms.filter((room) => !isPremium(room)))];
}

export function generateBookings({ rooms, reservations, referenceDate = new Date(), multiplier = 1, priceIdx = 1, carry = 0, premiumFirst = false, priceAdjust = null, segmentBias = null, proShare = 0, loyalty = null } = {}) {
  // Meeting rooms are sold to companies (lib/mice/), not as ordinary bedrooms.
  const bookableRooms = safeArray(rooms).filter((room) => room.status !== "maintenance" && room.status !== "hors_service" && !isMeetingRoom(room));
  const existing = safeArray(reservations);
  const expected = bookableRooms.length * BASE_ARRIVALS_PER_ROOM * multiplier + safeNumber(carry, 0);
  const count = bookableRooms.length === 0 ? 0 : Math.floor(expected);
  const nextCarry = bookableRooms.length === 0 ? 0 : expected - count;

  let all = existing;
  let nextId = existing.reduce((max, reservation) => Math.max(max, safeNumber(reservation.id, 0)), 0) + 1;
  let created = 0;
  let turnedAway = 0;
  // Yield management (lib/rm/): `priceAdjust(room, arrival, reservations)`
  // returns { multiplier, rules } for a booking; what each adjustment added
  // (or took off) over the plain price is kept for the report.
  const adjustments = [];
  let newBookingsValue = 0;

  for (let i = 0; i < count; i += 1) {
    const seq = existing.length + nextId + i;
    const arrival = addDays(referenceDate, LEAD_PATTERN[seq % LEAD_PATTERN.length]);
    const departure = addDays(arrival, STAY_PATTERN[(seq * 3 + 1) % STAY_PATTERN.length]);

    let booking = null;
    let bookingAdjustment = null;
    const nights = STAY_PATTERN[(seq * 3 + 1) % STAY_PATTERN.length];
    // A share of the day's bookings are club members coming back (lib/loyalty/):
    // they book direct, under their own name -- those who would have booked
    // through an OTA are the commission the club saves.
    const patternChannel = CHANNEL_PATTERN[seq % CHANNEL_PATTERN.length];
    const memberPool = safeArray(loyalty?.members);
    const memberShare = safeNumber(loyalty?.share, 0);
    // (a stable hash of the day and the booking: the average share holds whatever
    // the hotel's size, deterministically)
    const member = memberShare > 0 && memberPool.length > 0 && mixedRandom(`loyalty-book:${toDateOnly(referenceDate)}:${i}`) < memberShare ? memberPool[Math.floor(mixedRandom(`loyalty-who:${toDateOnly(referenceDate)}:${i}`) * memberPool.length) % memberPool.length] : null;
    const candidates = candidateRooms(bookableRooms, seq, premiumFirst);
    for (let offset = 0; offset < candidates.length && !booking; offset += 1) {
      const room = candidates[offset];
      const plainPrice = Math.round(safeNumber(room.price, 0) * priceIdx);
      const adjustment = priceAdjust ? priceAdjust(room, arrival, all) : null;
      const price = adjustment ? Math.round(plainPrice * adjustment.multiplier) : plainPrice;
      const candidate = createReservation({
        id: nextId,
        client_name: member ? member.name : `Client ${nextId}`,
        room_id: room.id,
        room: room.number,
        room_type: room.type,
        arrival: toDateOnly(arrival),
        departure: toDateOnly(departure),
        status: "confirmée",
        price,
        source: member ? "direct" : patternChannel,
        metadata: member ? { loyalty: { memberId: member.id, saved: patternChannel === "ota" } } : {},
        // A targeted campaign (digital, corporate) tilts two bookings in three
        // toward the segment it aims at.
        // In spring and autumn (lib/seasonEvents/) a fixed share of the bookings
        // are professional guests, whatever the campaigns.
        segment: segmentBias && i % 3 !== 2 ? segmentBias : proShare > 0 && Math.floor((i + 1) * proShare) > Math.floor(i * proShare) ? "business" : SEGMENT_PATTERN[seq % SEGMENT_PATTERN.length],
        created_at: new Date(referenceDate).toISOString(),
      });
      if (findReservationConflicts(all, candidate).length === 0) {
        booking = candidate;
        bookingAdjustment = adjustment && price !== plainPrice ? { reservationId: nextId, rules: adjustment.rules, delta: (price - plainPrice) * nights } : null;
      }
    }

    if (booking) {
      all = [...all, booking];
      if (bookingAdjustment) adjustments.push(bookingAdjustment);
      newBookingsValue += booking.price * nights;
      nextId += 1;
      created += 1;
    } else {
      turnedAway += 1;
    }
  }

  return { reservations: all, created, turnedAway, carry: nextCarry, adjustments, newBookingsValue };
}

// The one call the career loop makes each day (see careerEngine.js's
// runCareerDay()): compute demand, generate the day's bookings, and return
// the extended reservation list, the demand state to persist
// (`hotelState.demand`), and a report for the player.
export function applyDemand({ hotelState, rooms, reservations, referenceDate = new Date() } = {}) {
  const state = safeObject(hotelState);
  const demand = computeDemand({ hotelState: state, rooms, reservations, referenceDate });
  const generated = generateBookings({
    rooms,
    reservations,
    referenceDate,
    multiplier: demand.multiplier,
    priceIdx: demand.priceIndex,
    premiumFirst: demand.premiumFirst,
    segmentBias: demand.segmentBias,
    proShare: demand.proShare,
    loyalty: demand.loyalty,
    priceAdjust: createYieldPricer({ hotelState: state, rooms, referenceDate }),
    carry: safeObject(state.demand).carry,
  });

  return {
    reservations: generated.reservations,
    demandState: { carry: generated.carry, lastMultiplier: demand.multiplier },
    demandReport: {
      date: toDateOnly(referenceDate),
      multiplier: demand.multiplier,
      factors: demand.factors,
      reputation: demand.reputation,
      priceIndex: demand.priceIndex,
      newBookings: generated.created,
      turnedAway: generated.turnedAway,
      newBookingsValue: Math.round(generated.newBookingsValue),
      // What the player's commercial levers did today: the marketing
      // campaigns running and the yield-management price adjustments.
      levers: {
        marketing: { factor: demand.factors.marketing, campaigns: demand.campaigns },
        yield: summarizeYield(generated.adjustments, isYieldEnabled(state)),
      },
    },
  };
}

const POSITIVE_DRIVER = {
  reputation: "une excellente réputation",
  price: "des prix attractifs pour votre standing",
  season: "la haute saison",
  events: "des événements porteurs",
  marketing: "vos campagnes marketing",
  media: "votre campagne de réhabilitation",
  spa: "votre espace bien-être",
};
const NEGATIVE_DRIVER = {
  reputation: "une réputation en retrait",
  price: "des prix trop élevés pour votre standing",
  season: "la basse saison",
  events: "des événements défavorables",
  incidents: "des pannes non réparées et les avis négatifs qui en découlent",
  media: "la crise médiatique",
};

const STRONG = 1.1;
const WEAK = 0.9;

// A plain-language reading of a demand report for the player (DailyReview):
// the headline names the factor that moved demand the most in the
// direction the overall demand went.
export function describeDemand(report) {
  if (!report || !Number.isFinite(report.multiplier)) return null;
  const percent = Math.round(report.multiplier * 100);
  const tone = report.multiplier >= STRONG ? "strong" : report.multiplier <= WEAK ? "weak" : "stable";

  const drivers = Object.entries(safeObject(report.factors))
    .map(([key, factor]) => ({ key, factor: safeNumber(factor, 1) }))
    .filter((entry) => Math.abs(entry.factor - 1) >= 0.01)
    .sort((a, b) => Math.abs(b.factor - 1) - Math.abs(a.factor - 1));

  let headline = `Demande stable (${percent} %).`;
  if (tone === "strong") {
    const top = drivers.find((entry) => entry.factor > 1);
    headline = `Demande forte (${percent} %) grâce à ${(top && POSITIVE_DRIVER[top.key]) || "l'ensemble des facteurs"}.`;
  } else if (tone === "weak") {
    const top = drivers.find((entry) => entry.factor < 1);
    headline = `Demande en baisse (${percent - 100} %) suite à ${(top && NEGATIVE_DRIVER[top.key]) || "l'ensemble des facteurs"}.`;
  }

  return {
    tone,
    percent,
    headline,
    drivers: drivers.map((entry) => ({ key: entry.key, factor: entry.factor })),
    newBookings: safeNumber(report.newBookings, 0),
    turnedAway: safeNumber(report.turnedAway, 0),
  };
}

const DemandEngine = {
  computeDemand,
  generateBookings,
  applyDemand,
  describeDemand,
  seasonFactor,
  reputationFactor,
  priceIndex,
  priceFactor,
  eventFactor,
  incidentFactor,
};
export default DemandEngine;
