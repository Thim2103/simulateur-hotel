// Orchestrates the Staff module: given the player's own hotel bundle
// ({ hotelState, restaurantState, rooms, reservations } -- the same shape
// runDailyCycle()/careerEngine.startCareer()/lib/guest/guestAdapter.js's
// createGuestHotelBundle() all share) and, when available, the latest
// DailyReport (for real staffChanges/departures -- see
// lib/dailyCycle/updateStaff.js), computes one full HR cycle (headcount ->
// moral -> surcharge/sous-effectif -> absentéisme -> productivité ->
// turnover -> coûts RH -> diagnostics -> forecast), records it into the HR
// replay log, and exposes the STAFF_ACTION_CATALOG a player can apply to
// their own hotel bundle -- see staffActions.js.
import { safeArray, safeNumber, safeObject } from "../safe";
import {
  computeAbsenteeism,
  computeHeadcount,
  computeMorale,
  computeOverload,
  computePayrollCost,
  computeProductivity,
  computeTurnover,
} from "./staffCalculations";
import { generateStaffDiagnostics } from "./staffDiagnostics";
import { generateStaffForecast } from "./staffForecast";
import { createStaffState } from "./staffState";
import { recordCycle } from "../scenario/scenarioReplay";
import { applyStaffDecision, findStaffAction, STAFF_ACTION_CATALOG } from "./staffActions";

function toDateOnly(referenceDate) {
  return String(referenceDate?.toISOString ? referenceDate.toISOString() : referenceDate).slice(0, 10);
}

// 1-6. Runs one HR cycle against the player's hotel bundle: pulls
// restaurantState.staff/hotelState.finance/restaurantState.esg (see
// staffCalculations.js's own docstring for why hotel-side headcount is
// estimated rather than tracked per-person), and builds everything a
// StaffState needs on top of it.
export function runStaffCycle({ hotelBundle, dailyReport = null, previousState = null, referenceDate = new Date() } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const restaurantState = safeObject(bundle.restaurantState);
  const roomCount = safeArray(bundle.rooms).length;
  const restaurantStaff = safeArray(restaurantState.staff);
  const restaurantSeats = safeNumber(restaurantState.structure?.seats, safeNumber(restaurantState.structure?.capacity, 0));
  const staffWellbeing = safeNumber(restaurantState.esg?.staffWellbeing, 60);
  const previous = safeObject(previousState);
  const cyclesElapsed = safeNumber(previous.cyclesElapsed, 0) + 1;

  const headcount = computeHeadcount({ hotelFinance: hotelState.finance, restaurantStaff });
  const morale = computeMorale({ restaurantStaff, staffWellbeing });
  const { housekeepingLoad, serviceLoad, overload } = computeOverload({ roomCount, restaurantSeats, headcount });
  const absenteeism = computeAbsenteeism({ morale, overload });
  const productivity = computeProductivity({ restaurantStaff, overload });
  const departuresLast = safeArray(dailyReport?.staffChanges?.departures).length;
  const turnover = computeTurnover({ morale, overload, departuresLast, headcount });
  const payroll = computePayrollCost({ hotelFinance: hotelState.finance, restaurantFinance: restaurantState.finance });

  const diagnostics = generateStaffDiagnostics({ headcount, morale, productivity, absenteeism, overload, housekeepingLoad, serviceLoad, turnover });

  const nextState = createStaffState({
    period: toDateOnly(referenceDate),
    headcount,
    morale,
    productivity,
    absenteeism,
    overload,
    housekeepingLoad,
    serviceLoad,
    turnover,
    payroll,
    diagnostics,
    cyclesElapsed,
    replayLog: recordCycle(previous.replayLog, {
      cycleIndex: cyclesElapsed - 1,
      period: toDateOnly(referenceDate),
      headcount,
      morale,
      productivity,
      absenteeism,
      overload,
      turnover,
      payroll,
      diagnostics,
    }),
    lastUpdated: new Date().toISOString(),
  });

  const forecast = generateStaffForecast(nextState);
  return { ...nextState, forecast };
}

// Career integration -- "synchroniser avec careerEngine" (see the
// Refonte RH request's sections 1 and 5): builds an HR cycle straight
// from a CareerState (see lib/career/careerState.js), reading both the
// player's own hotel bundle and the latest DailyReport's staffChanges
// (real departures), so Career mode feeds the same Staff module a
// standalone (Guest Mode) session uses, without careerEngine.js needing
// to know anything about this module.
export function staffFromCareerState(careerState, previousStaffState = null) {
  const state = safeObject(careerState);
  return runStaffCycle({ hotelBundle: state.hotel, dailyReport: state.lastDayReport, previousState: previousStaffState });
}

// Assembles the full HR report StaffReport.jsx shows, and adapts
// staffDiagnostics.js's output into the same {type, severity, message}
// shape lib/analytics/analyticsDiagnostics.js uses -- "intégrer les
// diagnostics RH dans analyticsEngine" (section 5): rather than reaching
// into analyticsEngine's internals, this hands back a list in the exact
// shape analyzeRun()'s own diagnostics already have, so a caller can
// concat the two lists and treat them identically.
export function generateStaffReport(staffState) {
  const state = safeObject(staffState);
  return {
    period: state.period,
    generatedAt: new Date().toISOString(),
    headcount: state.headcount,
    morale: state.morale,
    productivity: state.productivity,
    absenteeism: state.absenteeism,
    overload: state.overload,
    housekeepingLoad: state.housekeepingLoad,
    serviceLoad: state.serviceLoad,
    turnover: state.turnover,
    payroll: state.payroll,
    diagnostics: safeArray(state.diagnostics),
    forecast: state.forecast,
    replay: { totalCycles: safeArray(state.replayLog?.entries).length, entries: safeArray(state.replayLog?.entries) },
  };
}

export function staffDiagnosticsToAnalytics(staffDiagnostics) {
  return safeArray(staffDiagnostics).map((entry) => ({ type: entry.type, severity: entry.severity, message: entry.message, cycleIndex: null }));
}

export { STAFF_ACTION_CATALOG, findStaffAction, applyStaffDecision };

export const staffEngine = {
  runStaffCycle,
  staffFromCareerState,
  generateStaffReport,
  staffDiagnosticsToAnalytics,
  applyStaffDecision,
  findStaffAction,
  STAFF_ACTION_CATALOG,
};
export default staffEngine;
