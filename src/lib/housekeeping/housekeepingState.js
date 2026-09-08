// Shape helpers for the Housekeeping module's own state -- mirrors
// lib/finance/financeState.js/lib/staff/staffState.js/lib/marketing/
// marketingState.js/lib/esg/esgState.js. Derived from the same hotel
// bundle every other engine shares, never owns it: this module only
// reads rooms/reservations/hotelState.housekeeping/Staff's own cycle and
// layers workload/productivity/cleaningTime/overload/understaffing/
// quality/diagnostics/forecast on top, then persists that layer (via
// lib/housekeepingRepository.js) plus its own replay log of past cycles.
import { safeArray, safeObject } from "../safe";
import { createReplayLog } from "../scenario/scenarioReplay";

export function createHousekeepingState(overrides = {}) {
  const source = safeObject(overrides);
  return {
    period: source.period || null,
    workload: source.workload || null,
    cleaningTime: source.cleaningTime || null,
    productivity: source.productivity ?? null,
    overload: source.overload ?? null,
    understaffing: source.understaffing || null,
    quality: source.quality ?? null,
    housekeeperCount: source.housekeeperCount ?? null,
    cost: source.cost ?? null,
    diagnostics: safeArray(source.diagnostics),
    forecast: source.forecast || null,
    cyclesElapsed: source.cyclesElapsed || 0,
    // One entry per HK cycle played -- "replay HK par cycle" (section
    // 5). Reuses the same tiny replay-log shape lib/scenario/
    // scenarioReplay.js already defines (see the same pattern in every
    // other module's *State.js).
    replayLog: source.replayLog || createReplayLog(),
    lastUpdated: source.lastUpdated || null,
  };
}
