// Shape helpers for the Marketing module's own state -- mirrors
// lib/finance/financeState.js/lib/staff/staffState.js. Derived from the
// same hotel bundle every other engine shares, never owns it: this
// module only reads hotelState.marketing/restaurantState/rooms/
// reservations and layers budget/ROI/conversion/segments/reputation/
// positioning/diagnostics/forecast on top, then persists that layer (via
// lib/marketingRepository.js) plus its own replay log of past cycles.
import { safeArray, safeObject } from "../safe";
import { createReplayLog } from "../scenario/scenarioReplay";

export function createMarketingState(overrides = {}) {
  const source = safeObject(overrides);
  return {
    period: source.period || null,
    budget: source.budget || null,
    roi: source.roi || null,
    conversion: source.conversion || null,
    segments: source.segments || null,
    reputation: source.reputation ?? null,
    positioningTier: source.positioningTier || null,
    channels: safeArray(source.channels),
    campaigns: safeArray(source.campaigns),
    crossSelling: source.crossSelling ?? null,
    diagnostics: safeArray(source.diagnostics),
    forecast: source.forecast || null,
    cyclesElapsed: source.cyclesElapsed || 0,
    // One entry per marketing cycle played -- "un replay marketing par
    // cycle" (section 5). Reuses the same tiny replay-log shape
    // lib/scenario/scenarioReplay.js already defines (see
    // lib/finance/financeState.js/lib/staff/staffState.js for the same
    // pattern).
    replayLog: source.replayLog || createReplayLog(),
    lastUpdated: source.lastUpdated || null,
  };
}
