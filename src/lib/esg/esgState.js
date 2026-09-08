// Shape helpers for the ESG module's own state -- mirrors
// lib/finance/financeState.js/lib/staff/staffState.js/lib/marketing/
// marketingState.js. Derived from the same hotel bundle every other
// engine shares, never owns it: this module only reads hotelState.esg/
// restaurantState.esg/PMS rooms/reservations and layers energy/water/
// waste/CO₂/score/certifications/diagnostics/forecast on top, then
// persists that layer (via lib/esgRepository.js) plus its own replay log
// of past cycles.
import { safeArray, safeObject } from "../safe";
import { createReplayLog } from "../scenario/scenarioReplay";

export function createEsgState(overrides = {}) {
  const source = safeObject(overrides);
  return {
    period: source.period || null,
    energy: source.energy ?? null,
    water: source.water ?? null,
    waste: source.waste ?? null,
    co2: source.co2 ?? null,
    costs: source.costs || null,
    score: source.score ?? null,
    certifications: safeArray(source.certifications),
    diagnostics: safeArray(source.diagnostics),
    forecast: source.forecast || null,
    cyclesElapsed: source.cyclesElapsed || 0,
    // One entry per ESG cycle played -- "replay ESG par cycle" (section
    // 5). Reuses the same tiny replay-log shape lib/scenario/
    // scenarioReplay.js already defines (see lib/finance/financeState.js
    // /lib/staff/staffState.js/lib/marketing/marketingState.js for the
    // same pattern).
    replayLog: source.replayLog || createReplayLog(),
    lastUpdated: source.lastUpdated || null,
  };
}
