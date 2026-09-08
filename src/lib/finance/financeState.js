// Shape helpers for the Finance module's own state -- separate from
// CareerState (see lib/career/careerState.js) but derived from the same
// hotel bundle { hotelState, restaurantState, rooms, reservations } every
// other engine in this app already shares (runDailyCycle(), careerEngine
// .startCareer(), lib/guest/guestAdapter.js's createGuestHotelBundle()).
// Finance never owns the hotel bundle itself; it only reads
// hotelState.finance/restaurantState.finance and layers the balance
// sheet/cash-flow/ratios/diagnostics/forecast this module adds on top,
// then persists that layer (via lib/financeRepository.js) plus its own
// replay log of past cycles.
import { safeArray, safeObject } from "../safe";
import { createReplayLog } from "../scenario/scenarioReplay";

export function createFinanceState(overrides = {}) {
  const source = safeObject(overrides);
  return {
    period: source.period || null,
    incomeStatement: source.incomeStatement || null,
    balanceSheet: source.balanceSheet || null,
    cashFlow: source.cashFlow || null,
    ratios: source.ratios || null,
    diagnostics: safeArray(source.diagnostics),
    forecast: source.forecast || null,
    // Running cash balance and cycle count -- the only figures the
    // balance sheet/cash-flow computations need to carry forward from one
    // cycle to the next (see financeCalculations.js's computeBalanceSheet
    // ()/computeCashFlow()).
    cash: source.cash ?? null,
    cyclesElapsed: source.cyclesElapsed || 0,
    // One entry per finance cycle played (see financeEngine.js's
    // runFinanceCycle()) -- "un replay financier par cycle" (see the
    // Refonte Finance request's section 5). Reuses the same tiny
    // replay-log shape lib/scenario/scenarioReplay.js already defines.
    replayLog: source.replayLog || createReplayLog(),
    lastUpdated: source.lastUpdated || null,
  };
}
