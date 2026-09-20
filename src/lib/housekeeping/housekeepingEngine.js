// Orchestrates the Housekeeping module: given the player's own hotel
// bundle ({ hotelState, restaurantState, rooms, reservations } -- the
// same shape runDailyCycle()/careerEngine.startCareer()/lib/guest/
// guestAdapter.js's createGuestHotelBundle() all share), computes one
// full HK cycle (charge -> temps de nettoyage -> productivité ->
// surcharge -> sous-effectif -> qualité -> coût -> diagnostics ->
// forecast), records it into the HK replay log, and exposes the
// HOUSEKEEPING_ACTION_CATALOG a player can apply to their own hotel
// bundle -- see housekeepingActions.js.
import { safeNumber, safeObject } from "../safe";
import {
  computeCleaningTime,
  computeHousekeeperCount,
  computeHousekeepingProductivity,
  computeWorkload,
  costOfHousekeeping,
  detectOverload,
  detectUnderstaffing,
  resolveHousekeepingSettings,
} from "./housekeepingCalculations";
import { computeQualityScore } from "./housekeepingQuality";
import { generateHousekeepingDiagnostics } from "./housekeepingDiagnostics";
import { generateHousekeepingForecast } from "./housekeepingForecast";
import { createHousekeepingState } from "./housekeepingState";
import { recordCycle } from "../scenario/scenarioReplay";
import { applyHousekeepingDecision, findHousekeepingAction, HOUSEKEEPING_ACTION_CATALOG } from "./housekeepingActions";
import { staffFromCareerState } from "../staff/staffEngine";
import { cleaningDelayFactor } from "../staff/staffRoster";
import { computeZoneEffects } from "../zones/zoneUpgradesEngine";
import { housekeepingPressureOf } from "../hotelEvents/hotelEventsEngine";

function toDateOnly(referenceDate) {
  return String(referenceDate?.toISOString ? referenceDate.toISOString() : referenceDate).slice(0, 10);
}

// 1-6. Runs one housekeeping cycle against the player's hotel bundle:
// pulls rooms/reservations (PMS) plus the Staff module's own
// productivity/overload/absenteeism/headcount and (optionally) today's
// guest satisfaction and ESG scores, and builds everything a
// HousekeepingState needs on top of them.
export function runHousekeepingCycle({
  hotelBundle,
  staffProductivity = null,
  staffOverload = null,
  staffAbsenteeism = null,
  hotelHeadcount = null,
  rmSatisfaction = null,
  esgEnergyScore = null,
  esgWaterScore = null,
  previousState = null,
  referenceDate = new Date(),
} = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const settings = resolveHousekeepingSettings(hotelState);
  const previous = safeObject(previousState);
  const cyclesElapsed = safeNumber(previous.cyclesElapsed, 0) + 1;

  const workload = computeWorkload({ rooms: bundle.rooms, reservations: bundle.reservations, referenceDate });
  const baseCleaningTime = computeCleaningTime({
    roomsToClean: workload.roomsToClean,
    stayovers: workload.priorities.stayovers,
    trainingLevel: settings.trainingLevel,
    processEfficiency: settings.processEfficiency,
  });
  // A shortage of housekeepers on the roster (lib/staff/staffRoster.js)
  // stretches the day's total cleaning time proportionally (1 = no change,
  // for a hotel with no roster or enough staff). The time spent PER room --
  // what quality reads as thoroughness -- is unchanged: fewer people don't
  // clean any room more carefully, they just clean fewer of them in time;
  // that shows up as lower quality below.
  // Zone upgrades (industrial laundry equipment...) speed it up, works in
  // the laundry slow it down (lib/zones/): x1 for a hotel that never upgraded.
  const slowdown = cleaningDelayFactor(hotelState) * computeZoneEffects(hotelState).cleaningTimeMultiplier * housekeepingPressureOf(hotelState);
  const cleaningTime = { totalMinutes: Math.round(baseCleaningTime.totalMinutes * slowdown), minutesPerRoom: baseCleaningTime.minutesPerRoom };
  const productivity = computeHousekeepingProductivity({ staffProductivity: staffProductivity ?? 65, staffOverload: staffOverload ?? 0, trainingLevel: settings.trainingLevel });
  const housekeeperCount = computeHousekeeperCount({ hotelHeadcount: hotelHeadcount ?? 0, staffingBonus: settings.staffingBonus });
  const overload = detectOverload({ totalMinutes: cleaningTime.totalMinutes, housekeeperCount });
  const understaffing = detectUnderstaffing({ roomsToClean: workload.roomsToClean, housekeeperCount, staffAbsenteeism: staffAbsenteeism ?? 0 });
  const shortageQualityFactor = Math.min(1, Math.max(0.6, 1 - (slowdown - 1) * 0.25));
  const quality = Math.round(computeQualityScore({ minutesPerRoom: cleaningTime.minutesPerRoom, productivity, trainingLevel: settings.trainingLevel, rmSatisfaction }) * shortageQualityFactor);
  const cost = costOfHousekeeping({ housekeeperCount });

  const diagnostics = generateHousekeepingDiagnostics({ workload, overload, understaffing, quality, productivity, priorities: workload.priorities, esgEnergyScore, esgWaterScore });

  const nextState = createHousekeepingState({
    period: toDateOnly(referenceDate),
    workload,
    cleaningTime,
    productivity,
    overload,
    understaffing,
    quality,
    housekeeperCount,
    cost,
    diagnostics,
    cyclesElapsed,
    replayLog: recordCycle(previous.replayLog, {
      cycleIndex: cyclesElapsed - 1,
      period: toDateOnly(referenceDate),
      roomsToClean: workload.roomsToClean,
      overload,
      quality,
      productivity,
      diagnostics,
    }),
    lastUpdated: new Date().toISOString(),
  });

  const forecast = generateHousekeepingForecast(nextState);
  return { ...nextState, forecast };
}

// Career integration -- "synchroniser avec careerEngine" (section 1/5):
// builds an HK cycle straight from a CareerState (see
// lib/career/careerState.js), also folding in the Staff module's own
// current headcount/productivity/overload/absenteeism and today's real
// guest satisfaction (dailyReport.restaurantReport.customerSatisfaction,
// 0-5, scaled to 0-100) so Career mode feeds the same Housekeeping
// module a standalone (Guest Mode) session uses, without careerEngine.js
// needing to know anything about this module.
export function housekeepingFromCareerState(careerState, previousHousekeepingState = null) {
  const state = safeObject(careerState);
  const staff = state.hotel ? staffFromCareerState(state) : null;
  const rawSatisfaction = state.lastDayReport?.restaurantReport?.customerSatisfaction;
  const rmSatisfaction = rawSatisfaction === undefined || rawSatisfaction === null ? null : Math.round(safeNumber(rawSatisfaction, 0) * 20);
  const hotelEsg = safeObject(state.hotel?.hotelState?.esg);

  return runHousekeepingCycle({
    hotelBundle: state.hotel,
    staffProductivity: staff?.productivity ?? null,
    staffOverload: staff?.overload ?? null,
    staffAbsenteeism: staff?.absenteeism ?? null,
    hotelHeadcount: staff?.headcount?.hotel ?? null,
    rmSatisfaction,
    esgEnergyScore: hotelEsg.energyConsumption ?? null,
    esgWaterScore: hotelEsg.waterUsage ?? null,
    previousState: previousHousekeepingState,
  });
}

// Assembles the full HK report HousekeepingReport.jsx shows, and adapts
// housekeepingDiagnostics.js's output into the same {type, severity,
// message} shape lib/analytics/analyticsDiagnostics.js uses --
// "intégrer les diagnostics HK dans analyticsEngine" (section 5).
export function generateHousekeepingReport(housekeepingState) {
  const state = safeObject(housekeepingState);
  return {
    period: state.period,
    generatedAt: new Date().toISOString(),
    workload: state.workload,
    cleaningTime: state.cleaningTime,
    productivity: state.productivity,
    overload: state.overload,
    understaffing: state.understaffing,
    quality: state.quality,
    housekeeperCount: state.housekeeperCount,
    cost: state.cost,
    diagnostics: state.diagnostics || [],
    forecast: state.forecast,
    replay: { totalCycles: (state.replayLog?.entries || []).length, entries: state.replayLog?.entries || [] },
  };
}

export function housekeepingDiagnosticsToAnalytics(housekeepingDiagnostics) {
  return (housekeepingDiagnostics || []).map((entry) => ({ type: entry.type, severity: entry.severity, message: entry.message, cycleIndex: null }));
}

export { HOUSEKEEPING_ACTION_CATALOG, findHousekeepingAction, applyHousekeepingDecision };

export const housekeepingEngine = {
  runHousekeepingCycle,
  housekeepingFromCareerState,
  generateHousekeepingReport,
  housekeepingDiagnosticsToAnalytics,
  applyHousekeepingDecision,
  findHousekeepingAction,
  HOUSEKEEPING_ACTION_CATALOG,
};
export default housekeepingEngine;
