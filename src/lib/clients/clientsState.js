// Shape helpers for the Clients module's own state -- mirrors
// lib/housekeeping/housekeepingState.js / lib/esg/esgState.js. Derived
// from the same hotel bundle every other engine shares, never owns it:
// this module only reads rooms/reservations/hotelState and the other
// modules' outputs and layers segments/satisfaction/reviews/loyalty/
// complaints/behaviors/diagnostics/forecast on top, then persists that
// layer (via lib/clientsRepository.js) plus its own replay log.
import { safeArray, safeObject } from "../safe";
import { createReplayLog } from "../scenario/scenarioReplay";

export function createClientsState(overrides = {}) {
  const source = safeObject(overrides);
  return {
    period: source.period || null,
    // Segment distribution (shares summing to ~100)
    segments: source.segments || { business: 30, leisure: 40, famille: 20, premium: 10 },
    // 0-100 weighted satisfaction (HK 30%, Staff 20%, RM 20%, Restaurant 15%, ESG 10%, Marketing 5%)
    satisfaction: source.satisfaction ?? null,
    // 0-100 loyalty score
    loyalty: source.loyalty ?? null,
    // Guest reviews aggregate
    reviews: source.reviews || { avgRating: null, count: 0, positive: 0, negative: 0, trend: "stable" },
    // Active complaints list
    complaints: safeArray(source.complaints),
    // Behavioral indicators
    behaviors: source.behaviors || { avgSpend: null, returnRate: null, preferredSegment: null },
    diagnostics: safeArray(source.diagnostics),
    forecast: source.forecast || null,
    cyclesElapsed: source.cyclesElapsed || 0,
    // One entry per clients cycle played -- "replay clients par cycle".
    // Reuses the same tiny replay-log shape lib/scenario/scenarioReplay.js
    // already defines.
    replayLog: source.replayLog || createReplayLog(),
    lastUpdated: source.lastUpdated || null,
  };
}
