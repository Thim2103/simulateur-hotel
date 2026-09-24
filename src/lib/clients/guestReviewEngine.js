// Guest reviews and how the player answers them.
//
// Until now the only individual reviews in the game were the ones caused by
// equipment breakdowns (lib/maintenance/incidentImpact.js). Here every stay
// that ends can leave a review of its own: written by a guest with a profile
// (family, business, long stay, V.I.P. -- see guestProfiles.js), rated from
// how the hotel really was (unrepaired breakdowns, its condition, its
// reputation, a dash of luck), and worded accordingly. Reviews are stored at
// `hotelState.guestReviews`; the player's answers at
// `hotelState.reviewResponses[reviewId]` (which works for the older
// breakdown reviews too).
//
// A review moves the hotel's reputation and the next day's demand by an
// IMPACT: +0.6 / +0.3 / 0 / -0.6 / -1.2 reputation points for 5 to 1 stars,
// times the guest's weight (x3 for a V.I.P.). The impact lands once, the day
// after the review is posted (it is "pending" until then): the reputation
// calculation (progression/reputation.js) and the demand model
// (demand/demandEngine.js) both read the pending total, and
// advanceGuestReviews() settles it at the end of the day.
//
// The player can answer, and the answer changes that impact (a bad review's
// is negative, so "reduces" means "closer to zero"):
//   courteous   -- a polite reply: +0.5 x weight on a bad review, a small
//                  +0.2 x weight thank-you on a good one. Free.
//   gesture     -- a commercial gesture (a night offered): wipes out 90 % of
//                  a bad review's impact. Costs a night's price from the
//                  treasury. Bad and neutral reviews only.
//   ignore      -- leaves a bad review to fester: x1.25. (On a good one, no
//                  change.)
//   aggressive  -- a hostile reply: x1.5 plus a further -0.5 x weight. Bad
//                  reviews only.
// An answer given AFTER the impact was applied corrects it the next day.
//
// Pure and deterministic (FNV hash, no rng). A hotel with no departures and
// no answers keeps none of this state.
import { safeArray, safeNumber, safeObject } from "../safe.js";
import { treasuryOf } from "../finance/investmentFunding";
import { debitCurrentMonth } from "../finance/oneOffCosts";
import { hotelCondition } from "../maintenance/maintenanceCostEngine";
import { openIncidents } from "../maintenance/incidentImpact";
import { PROFILES, UNLUCKY_STAY_CHANCE, mixedRandom, profileIdFor, stayNights, weightOf } from "./guestProfiles";
import { pressHighlightFor, vipStayOutcome } from "./vipServiceEngine";
import { satisfactionPenaltyForStay, POINTS_PER_STAR } from "../seasonEvents/seasonEventEngine";
import { ecoRatingBonus } from "../expansion/majorProjectsEngine";

export const MAX_STORED_REVIEWS = 40;
export const MAX_NEW_REVIEWS_PER_DAY = 5;
export const REVIEWER_SHARE = 0.5; // share of guests who leave a review (a V.I.P. always does)
export { UNLUCKY_STAY_CHANCE };
export const MAX_DEMAND_SHIFT = 0.15;
export const DEMAND_PER_POINT = 0.01;
export const INCIDENT_GESTURE_COST = 150;

// Reputation points a review is worth, by stars (before the guest's weight).
export const RATING_IMPACT = { 5: 0.6, 4: 0.3, 3: 0, 2: -0.6, 1: -1.2 };

export const RESPONSE_TYPES = {
  courteous: { id: "courteous", label: "Réponse courtoise", description: "Une réponse polie et soignée." },
  gesture: { id: "gesture", label: "Geste commercial", description: "Une nuitée offerte : efface presque tout l'impact négatif." },
  ignore: { id: "ignore", label: "Ignorer", description: "Ne pas répondre publiquement : le malus s'aggrave." },
  aggressive: { id: "aggressive", label: "Réponse agressive", description: "Répondre sur le même ton : le malus s'aggrave nettement." },
};

const TEXTS = {
  family: {
    good: ["Séjour parfait en famille, les enfants ont adoré !", "Chambre spacieuse et personnel adorable, nous reviendrons."],
    ok: ["Séjour correct en famille, quelques détails à améliorer."],
    bad: ["Déçus : le séjour n'était pas à la hauteur, surtout avec des enfants.", "Trop de désagréments pour le prix payé."],
  },
  business: {
    good: ["Efficace et calme, idéal pour un déplacement professionnel.", "Tout était fluide : arrivée rapide, chambre impeccable."],
    ok: ["Correct pour une nuit d'affaires, sans plus."],
    bad: ["Service en dessous de ce qu'on attend pour un séjour pro.", "Trop de couacs pour un déplacement professionnel."],
  },
  "long-stay": {
    good: ["Après plusieurs nuits, on s'y sentait comme chez soi.", "Un long séjour très agréable, équipe aux petits soins."],
    ok: ["Long séjour agréable, mais l'entretien pourrait être plus régulier."],
    bad: ["Sur la durée, les défauts deviennent pesants.", "Un long séjour gâché par un entretien insuffisant."],
  },
  vip: {
    good: ["Expérience incroyable, je la partage avec toute ma communauté ! ✨", "Un accueil à la hauteur de mes attentes, bravo à l'équipe."],
    // After attentions that took the stay to the top: a glowing review.
    praise: ["Des attentions délicates du début à la fin : une adresse que je recommande à toute ma communauté ! ✨", "Accueil aux petits soins, on a pensé à tout. Mes abonnés doivent découvrir cet hôtel !"],
    ok: ["Sympa, mais je m'attendais à mieux pour ce niveau de prix."],
    bad: ["Très déçu(e) : j'en parle à toute ma communauté.", "Pas à la hauteur du standing annoncé, mes abonnés vont le savoir."],
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

// A Date (or an ISO string, with or without a time) as its UTC day, YYYY-MM-DD.
function toDay(value) {
  return (value?.toISOString ? value.toISOString() : String(value ?? "")).slice(0, 10);
}

// ---- impact ------------------------------------------------------------------

export function baseImpact(rating, weight = 1) {
  return round1((RATING_IMPACT[clamp(Math.round(safeNumber(rating, 3)), 1, 5)] ?? 0) * weight);
}

export function isNegative(review) {
  return review.impact < 0;
}

// What a review is worth once answered with `type` (or unanswered).
export function effectiveImpact(base, weight, type) {
  if (!type) return base;
  if (base < 0) {
    if (type === "courteous") return round1(Math.min(0, base + 0.5 * weight));
    if (type === "gesture") return round1(base * 0.1);
    if (type === "ignore") return round1(base * 1.25);
    if (type === "aggressive") return round1(base * 1.5 - 0.5 * weight);
    return base;
  }
  if (type === "courteous") return round1(base + 0.2 * weight);
  return base;
}

// ---- reading the state ------------------------------------------------------------

function responses(hotelState) {
  return safeObject(safeObject(hotelState).reviewResponses);
}

function storedReviews(hotelState) {
  return safeArray(safeObject(hotelState).guestReviews);
}

// Stay reviews and breakdown reviews as one list: { id, source, day, rating,
// text, profile, weight, guestName, impact, applied, response, ... }, newest
// first. A breakdown review's impact is already counted through the incident
// penalties (`applied` = its impact), so only an answer moves it.
export function listReviews(hotelState) {
  const answers = responses(hotelState);
  const stays = storedReviews(hotelState).map((review) => ({ ...review, response: answers[review.id] || null }));
  const incidents = safeArray(safeObject(hotelState).incidentReviews).map((review) => {
    const impact = baseImpact(review.rating, 1);
    const response = answers[review.id] || null;
    return {
      id: review.id,
      source: "incident",
      day: review.day,
      rating: review.rating,
      text: review.text,
      zone: review.zone,
      incidentId: review.incidentId,
      profile: null,
      weight: 1,
      guestName: null,
      impact,
      applied: response ? safeNumber(response.applied, impact) : impact,
      nightPrice: INCIDENT_GESTURE_COST,
      response,
    };
  });
  return [...stays, ...incidents].sort((a, b) => b.day - a.day || String(b.id).localeCompare(String(a.id)));
}

export function findReview(hotelState, reviewId) {
  return listReviews(hotelState).find((review) => review.id === reviewId) || null;
}

export function reviewsPostedOn(hotelState, day) {
  return storedReviews(hotelState).filter((review) => review.day === day);
}

// What a review is worth now, answer included.
export function currentImpact(review) {
  return effectiveImpact(review.impact, review.weight, review.response?.type);
}

function pendingOf(review) {
  return currentImpact(review) - safeNumber(review.applied, 0);
}

// Reputation points still to be applied: the reviews posted since the last
// settled day, and the correction of any answer given since.
export function pendingReputationDelta(hotelState) {
  return round1(listReviews(hotelState).reduce((sum, review) => sum + pendingOf(review), 0));
}

// The same pending points as a shift of the reputation's demand factor
// (1 point = 1 % of demand), so a V.I.P.'s x3 shows in tomorrow's bookings.
export function pendingDemandShift(hotelState) {
  return clamp(pendingReputationDelta(hotelState) * DEMAND_PER_POINT, -MAX_DEMAND_SHIFT, MAX_DEMAND_SHIFT);
}

// Reviews still waiting for an answer that would matter: bad ones.
export function unansweredNegativeReviews(hotelState) {
  return listReviews(hotelState).filter((review) => review.impact < 0 && !review.response);
}

// ---- answering ------------------------------------------------------------------------

// Every answer the player can give to a review, with what it costs and what
// the review would then be worth: [{ type, label, description, cost,
// resulting, available, reason }].
export function responseOptions(hotelState, review) {
  if (!review) return [];
  const negative = review.impact < 0;
  const neutral = review.impact === 0;
  const cost = { courteous: 0, gesture: safeNumber(review.nightPrice, 0), ignore: 0, aggressive: 0 };
  const applicable = { courteous: true, gesture: negative || neutral, ignore: true, aggressive: negative };

  return Object.values(RESPONSE_TYPES)
    .filter((type) => applicable[type.id])
    .map((type) => {
      const affordable = cost[type.id] === 0 || treasuryOf(hotelState) >= cost[type.id];
      return {
        type: type.id,
        label: type.label,
        description: type.description,
        cost: cost[type.id],
        resulting: effectiveImpact(review.impact, review.weight, type.id),
        available: !review.response && affordable,
        reason: review.response ? "Déjà répondu" : affordable ? "" : "Trésorerie insuffisante",
      };
    });
}

// Answers a review. A no-op unless the review exists, has no answer yet, the
// answer applies to it and (for a gesture) the treasury can pay for it.
export function respondToReview(hotelBundle, reviewId, type, { day = 0 } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const review = findReview(hotelState, reviewId);
  const option = responseOptions(hotelState, review).find((item) => item.type === type);
  if (!review || !option || !option.available) return bundle;

  const debited = option.cost > 0 ? debitCurrentMonth(hotelState, option.cost) : hotelState;
  const record = { type, day, cost: option.cost, ...(review.source === "incident" ? { applied: review.applied } : {}) };
  return { ...bundle, hotelState: { ...debited, reviewResponses: { ...responses(hotelState), [reviewId]: record } } };
}

// ---- generating the reviews of departing guests ------------------------------------

function ratingOf({ reservation, profileId, hotelState }) {
  const id = reservation.id;
  let score = 3 + mixedRandom(`rating:${id}`) * 2; // 3..5 for an ordinary stay
  if (mixedRandom(`unlucky:${id}`) < UNLUCKY_STAY_CHANCE) score -= 2;
  // Noise and waiting during roadworks (lib/seasonEvents/): points out of 100, in stars.
  score -= satisfactionPenaltyForStay(reservation) / POINTS_PER_STAR;
  // An eco-friendly hotel (lib/expansion/majorProjectsEngine.js) is rated a little higher.
  score += ecoRatingBonus(hotelState);
  if (openIncidents(hotelState).some((incident) => (incident.daysOpen || 0) >= 1)) score -= 1;
  const condition = hotelCondition(hotelState);
  if (condition < 60) score -= 1;
  else if (condition >= 90) score += 0.5;
  if (safeNumber(safeObject(safeObject(safeObject(hotelState).progression).player).reputation, 60) < 40) score -= 0.5;
  // A V.I.P. is never lukewarm.
  if (profileId === "vip") score = score < 3.5 ? score - 1 : 5;
  return clamp(Math.round(score), 1, 5);
}

// The stars a departing guest would give, whether or not they write a review
// (a V.I.P.'s follow their satisfaction): what the loyalty club reads.
export function stayRating({ reservation, room, hotelState }) {
  const profileId = profileIdFor(reservation, room);
  return profileId === "vip" ? vipStayOutcome({ reservation, hotelState }).rating : ratingOf({ reservation, profileId, hotelState });
}

function textOf({ profileId, rating, id, praise = false }) {
  const pool = praise ? TEXTS[profileId].praise : TEXTS[profileId][rating >= 4 ? "good" : rating === 3 ? "ok" : "bad"];
  return pool[Math.floor(mixedRandom(`text:${id}`) * pool.length) % pool.length];
}

// The reviews of the guests who leave on `date`: about half of them write
// one (a V.I.P. always does), at most a handful a day.
export function reviewsForDepartures({ hotelState, reservations, rooms, date, day }) {
  const roomsById = new Map(safeArray(rooms).map((room) => [Number(room.id), room]));
  const today = toDay(date);
  return safeArray(reservations)
    .filter((reservation) => !String(reservation.status || "").toLowerCase().includes("annul") && reservation.source !== "mice-meeting" && toDay(reservation.departure) === today)
    .map((reservation) => ({ reservation, room: roomsById.get(Number(reservation.room_id)) }))
    .map(({ reservation, room }) => ({ reservation, room, profileId: profileIdFor(reservation, room) }))
    .filter(({ reservation, profileId }) => profileId === "vip" || mixedRandom(`posts:${reservation.id}`) < REVIEWER_SHARE)
    .slice(0, MAX_NEW_REVIEWS_PER_DAY)
    .map(({ reservation, room, profileId }) => {
      // A V.I.P.'s review follows their satisfaction, which the attentions
      // the player gave (vipServiceEngine.js) may have raised; a glowing one
      // earns a reputation boost on top of the usual weight.
      const outcome = profileId === "vip" ? vipStayOutcome({ reservation, hotelState }) : null;
      const rating = outcome ? outcome.rating : ratingOf({ reservation, profileId, hotelState });
      const weight = weightOf(profileId);
      const nights = stayNights(reservation);
      const nightPrice = Math.round(safeNumber(reservation.price, 0));
      return {
        id: `stay:${reservation.id}`,
        source: "stay",
        reservationId: reservation.id,
        guestName: reservation.client_name || `Client ${reservation.id}`,
        profile: profileId,
        weight,
        roomNumber: room?.number ?? reservation.room ?? "",
        nights,
        nightPrice,
        rating,
        text: textOf({ profileId, rating, id: reservation.id, praise: !!outcome?.praise }),
        day,
        date: today,
        impact: round1(baseImpact(rating, weight) + (outcome?.praiseBonus || 0)),
        applied: 0,
        ...(outcome ? { satisfaction: outcome.satisfaction, praise: outcome.praise } : {}),
      };
    });
}

// Settles the reviews whose impact has just been taken into account (they
// stop being pending), then posts today's new ones (pending until tomorrow's
// reputation and demand). Called once per played day by
// careerEngine.runCareerDay(), after the daily cycle. A no-op for a hotel
// with no reviews and no departures.
export function advanceGuestReviews(hotelState, { date, day, reservations, rooms } = {}) {
  const state = safeObject(hotelState);
  const answers = responses(state);

  const settled = storedReviews(state).map((review) => {
    const target = effectiveImpact(review.impact, review.weight, answers[review.id]?.type);
    return target === review.applied ? review : { ...review, applied: target };
  });
  const settledAnswers = Object.fromEntries(
    Object.entries(answers).map(([id, record]) => {
      if (record.applied === undefined) return [id, record];
      const review = safeArray(state.incidentReviews).find((item) => item.id === id);
      return [id, review ? { ...record, applied: effectiveImpact(baseImpact(review.rating, 1), 1, record.type) } : record];
    })
  );

  const known = new Set(settled.map((review) => review.id));
  const fresh = reviewsForDepartures({ hotelState: state, reservations, rooms, date, day }).filter((review) => !known.has(review.id));
  const reviewsChanged = fresh.length > 0 || settled.some((review, index) => review !== storedReviews(state)[index]);
  const answersChanged = Object.keys(answers).some((id) => settledAnswers[id] !== answers[id]);
  if (!reviewsChanged && !answersChanged) return hotelState;

  // A glowing V.I.P. review makes the front page (see pressHighlights()).
  const highlights = fresh
    .filter((review) => review.praise)
    .map((review) => pressHighlightFor({ reservation: safeArray(reservations).find((item) => item.id === review.reservationId), review }));

  return {
    ...state,
    guestReviews: [...settled, ...fresh].slice(-MAX_STORED_REVIEWS),
    ...(Object.keys(answers).length > 0 ? { reviewResponses: settledAnswers } : {}),
    ...(highlights.length > 0 ? { pressHighlights: [...safeArray(state.pressHighlights), ...highlights].slice(-10) } : {}),
  };
}

// The feature articles glowing V.I.P. reviews earned, newest first.
export function pressHighlights(hotelState) {
  return safeArray(safeObject(hotelState).pressHighlights).slice().reverse();
}

// A review as the player reads it: its profile and what it is worth now.
export function describeReview(review) {
  return { ...review, profileInfo: PROFILES[review.profile] || null, currentImpact: currentImpact(review) };
}
