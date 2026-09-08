// Shape helpers for the Staff module's own state -- mirrors
// lib/finance/financeState.js. Derived from the same hotel bundle every
// other engine shares, never owns it: this module only reads
// restaurantState.staff/hotelState.finance/restaurantState.esg and layers
// moral/productivité/absentéisme/surcharge/turnover/payroll/diagnostics/
// forecast on top, then persists that layer (via lib/staffRepository.js)
// plus its own replay log of past cycles.
import { safeArray, safeObject } from "../safe";
import { createReplayLog } from "../scenario/scenarioReplay";

export function createStaffState(overrides = {}) {
  const source = safeObject(overrides);
  return {
    period: source.period || null,
    headcount: source.headcount || null,
    morale: source.morale ?? null,
    productivity: source.productivity ?? null,
    absenteeism: source.absenteeism ?? null,
    overload: source.overload ?? null,
    housekeepingLoad: source.housekeepingLoad ?? null,
    serviceLoad: source.serviceLoad ?? null,
    turnover: source.turnover || null,
    payroll: source.payroll || null,
    diagnostics: safeArray(source.diagnostics),
    forecast: source.forecast || null,
    cyclesElapsed: source.cyclesElapsed || 0,
    // One entry per HR cycle played -- "un replay RH par cycle" (see the
    // Refonte RH request's section 5). Reuses the same tiny replay-log
    // shape lib/scenario/scenarioReplay.js already defines (see
    // lib/finance/financeState.js for the same pattern).
    replayLog: source.replayLog || createReplayLog(),
    lastUpdated: source.lastUpdated || null,
  };
}
