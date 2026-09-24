// The market context a career's hotel sits in (Étape 5): which
// destination, what season it really is (reads lib/hotelEvents/
// hotelEventsEngine.js's own seasonOn()/seasonIdOn() -- never reinvents
// seasons), which guest segment the destination typically draws today,
// whether a local event is worth mentioning, and how the local
// competition prices itself. Every figure here is a READ -- built for
// the Dashboard/Journal's own market indicator (see
// components/dashboard/MarketContextCard.jsx) -- not yet wired into the
// live booking engine (lib/demand/demandEngine.js keeps computing
// bookings exactly as before): plugging a destination-aware multiplier
// into that engine is a deliberately separate, larger change with its
// own wide test surface, left for a later pass so this one stays
// additive and risk-free. Pure, deterministic (mixedRandom, no rng), no
// new state written -- hotelState.market is only ever read here.
import { safeNumber, safeObject } from "../safe.js";
import { seasonOn, seasonIdOn } from "../hotelEvents/hotelEventsEngine";
import { mixedRandom } from "../clients/guestProfiles";
import { DESTINATIONS, DEFAULT_DESTINATION_ID, destinationById } from "./destinations/destinations";
import { SEGMENTS, segmentById } from "./segments/segments";
import { competitorsForDestination } from "./competitors/competitors";

export { DESTINATIONS, SEGMENTS };

// hotelState.market = { destinationId } -- absent on any career started
// before Étape 5 (or one that never touched it): always falls back to
// "Ma Première Auberge" 's own Ardennes/Campagne setting, so no existing
// save breaks.
export function destinationOf(hotelState) {
  const id = safeObject(safeObject(hotelState).market).destinationId;
  return destinationById(id) || destinationById(DEFAULT_DESTINATION_ID);
}

// A deterministic (hash-based, not random) pick among the destination's
// own typical segments -- changes by day, not by render, the same
// mixedRandom() pattern lib/clients/guestProfiles.js already uses for
// per-guest determinism.
export function dominantSegmentOf(destination, day = 0) {
  const pool = destination.typicalSegments.length > 0 ? destination.typicalSegments : [destination.id];
  const index = Math.floor(mixedRandom(`market-segment:${destination.id}:${day}`) * pool.length) % pool.length;
  return segmentById(pool[index]);
}

// A local event worth surfacing today, drawn at the destination's own
// eventFrequency (e.g. Ardennes' 0.15 means roughly 1 day in 7) --
// purely informational, boosting a named segment's appeal in name only
// for now (see this module's own docstring on why demand isn't touched
// yet). Null most days.
const LOCAL_EVENTS = [
  { id: "concert-local", label: "Concert local", icon: "🎵", boostsSegment: "couples-leisure" },
  { id: "marche-artisanal", label: "Marché artisanal", icon: "🧺", boostsSegment: "families" },
  { id: "salon-affaires", label: "Salon d'affaires local", icon: "💼", boostsSegment: "business" },
  { id: "rando-guidee", label: "Randonnée guidée organisée", icon: "🥾", boostsSegment: "hikers-eco" },
];

export function localEventOf(destination, day = 0) {
  const roll = mixedRandom(`market-event:${destination.id}:${day}`);
  if (roll >= destination.eventFrequency) return null;
  const index = Math.floor(mixedRandom(`market-event-pick:${destination.id}:${day}`) * LOCAL_EVENTS.length) % LOCAL_EVENTS.length;
  const event = LOCAL_EVENTS[index];
  return { ...event, boostedSegment: segmentById(event.boostsSegment) };
}

// What the local competition asks per night, on average, and how the
// hotel's own average price compares (`delta`, a %, positive = the hotel
// is dearer). Null for a destination with no competitor archetype yet.
export function competitivePressureOf(destination, hotelAveragePrice) {
  const competitors = competitorsForDestination(destination.id);
  if (competitors.length === 0) return null;
  const averagePrice = Math.round(competitors.reduce((sum, competitor) => sum + competitor.basePrice, 0) / competitors.length);
  const hasHotelPrice = hotelAveragePrice !== null && hotelAveragePrice !== undefined && Number.isFinite(hotelAveragePrice);
  return {
    averagePrice,
    competitorsCount: competitors.length,
    delta: hasHotelPrice ? Math.round(((hotelAveragePrice - averagePrice) / averagePrice) * 100) : null,
  };
}

// The full market context for one day: destination, the real season,
// a destination-adjusted demand estimate (informational -- see this
// module's own docstring), the dominant segment, today's local event (if
// any) and the competitive pressure. `day` only needs to be stable
// (careerState.day is fine); `hotelAveragePrice` is optional (e.g.
// kpis.averagePrice), read only for the competitive comparison.
export function buildMarketContext({ hotelState, date, day = 0, hotelAveragePrice } = {}) {
  const destination = destinationOf(hotelState);
  const season = seasonOn(date);
  const seasonId = seasonIdOn(date);
  const seasonalityMultiplier = safeNumber(destination.seasonalityProfile[seasonId], 1);
  const demandEstimate = Math.round(destination.baseDemand * seasonalityMultiplier * season.demand * 100) / 100;

  return {
    destination,
    season,
    demandEstimate,
    dominantSegment: dominantSegmentOf(destination, day),
    localEvent: localEventOf(destination, day),
    competitivePressure: competitivePressureOf(destination, hotelAveragePrice),
  };
}

const marketContextEngine = { destinationOf, dominantSegmentOf, localEventOf, competitivePressureOf, buildMarketContext };
export default marketContextEngine;
