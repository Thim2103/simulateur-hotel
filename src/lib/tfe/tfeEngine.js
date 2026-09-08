// Orchestrates the TFE Solo mode: a self-contained 36-month playthrough
// that drives its own embedded CareerState (see lib/career/careerEngine
// .js) directly -- never through context/CareerContext.jsx, so a TFE run
// never mixes with the player's regular Solo/Carrière save -- and layers
// every business module's own per-cycle engine on top of each month
// played, exactly the way pages/Dashboard.jsx's lib/dashboard/
// dashboardEngine.js already does for the regular mode (see
// financeFromCareerState()/staffFromCareerState()/
// marketingFromCareerState()/esgFromCareerState()/
// housekeepingFromCareerState(), all reused unchanged).
import { safeArray, safeObject } from "../safe";
import { startCareer as startCareerEngine, runCareerDay } from "../career/careerEngine";
import { buildReplayRunFromCareerRun } from "../replay/replayEngine";
import { analyzeRun } from "../analytics/analyticsEngine";
import { financeFromCareerState } from "../finance/financeEngine";
import { staffFromCareerState } from "../staff/staffEngine";
import { marketingFromCareerState } from "../marketing/marketingEngine";
import { esgFromCareerState } from "../esg/esgEngine";
import { housekeepingFromCareerState } from "../housekeeping/housekeepingEngine";
import { applyScheduledEvents, createTfeHotelBundle } from "./tfeScenario";
import {
  computeChapterProgress,
  evaluateTfeMissions,
  evaluateTfeObjectives,
  missionsJustCompleted,
  seedChapters,
  seedTfeMissions,
  seedTfeObjectives,
} from "./tfeStoryline";
import { computeEbitdaMargin, computeRisksAndOpportunities, computeTfeScore, scoreGrade } from "./tfeScore";
import { generateTfeDiagnostics } from "./tfeDiagnostics";
import { generateTfeForecast } from "./tfeForecast";
import { generateTfeReport } from "./tfeReport";
import { applyTfeDecision, findTfeAction, TFE_ACTION_CATALOG } from "./tfeActions";
import { createTfeState } from "./tfeState";

// Builds the flat "month snapshot" every business module's own cycle
// feeds into -- read by tfeStoryline.js's evaluateTfeMissions()/
// evaluateTfeObjectives() (dotted KPI paths) and by tfeScore.js/
// tfeDiagnostics.js.
function buildMonthSnapshot(careerState) {
  const finance = financeFromCareerState(careerState);
  const staff = staffFromCareerState(careerState);
  const marketing = marketingFromCareerState(careerState);
  const esg = esgFromCareerState(careerState);
  const housekeeping = housekeepingFromCareerState(careerState);

  const rooms = safeArray(careerState?.hotel?.rooms);
  const occupiedRooms = rooms.filter((room) => String(room.status || "").toLowerCase() !== "libre").length;
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;
  const ebitdaMargin = computeEbitdaMargin({ ebitda: finance.incomeStatement.ebitda, revenue: finance.incomeStatement.revenues.total });

  const moduleDiagnostics = [
    ...safeArray(finance.diagnostics),
    ...safeArray(staff.diagnostics),
    ...safeArray(marketing.diagnostics),
    ...safeArray(esg.diagnostics),
    ...safeArray(housekeeping.diagnostics),
  ];

  return {
    occupancyRate,
    ebitdaMargin,
    finance: { ebitda: finance.incomeStatement.ebitda, revenue: finance.incomeStatement.revenues.total, netIncome: finance.incomeStatement.netIncome, cash: finance.balanceSheet.assets.cash },
    staff: { morale: staff.morale, overload: staff.overload, absenteeism: staff.absenteeism, productivity: staff.productivity },
    marketing: { roi: marketing.roi.overallRoi, reputation: marketing.reputation },
    esg: { score: esg.score },
    housekeeping: { quality: housekeeping.quality, overload: housekeeping.overload },
    moduleDiagnostics,
  };
}

function completionRatio(items) {
  const list = safeArray(items);
  if (!list.length) return 0;
  return list.filter((item) => item.achieved).length / list.length;
}

// 1. "création d'un hôtel" (section 1): builds the hotel bundle from the
// player's own choices and starts the embedded career against it.
export function startTfe({ playerId, hotelConfig, referenceDate = new Date() } = {}) {
  const hotelBundle = createTfeHotelBundle({ ...safeObject(hotelConfig), referenceDate });
  const career = startCareerEngine({ playerId, ...hotelBundle });

  return createTfeState({
    tfeId: `tfe-${Date.now()}`,
    playerId,
    status: "active",
    hotelConfig,
    month: 0,
    horizonMonths: 36,
    career,
    chapters: seedChapters(),
    missions: seedTfeMissions(),
    objectives: seedTfeObjectives(),
    performanceHistory: [],
    score: null,
    diagnostics: [],
    forecast: null,
    report: null,
    lastUpdated: new Date().toISOString(),
  });
}

// 2-5. Plays one month: applies this month's scripted timeline event (if
// any, see tfeScenario.js's TFE_TIMELINE), advances the embedded career
// by one day (one "month" tick, see this file's header for why), then
// recomputes every business module's own cycle, the TFE score, the
// storyline, and (once month 36 is reached) the final report.
export async function playTfeMonth({ tfeState, decisions = {}, referenceDate = new Date(), rng = Math.random } = {}) {
  const state = safeObject(tfeState);
  if (state.status !== "active") return { state: tfeState, monthReport: null };

  const nextMonth = state.month + 1;
  const scheduled = applyScheduledEvents(nextMonth, state.career.hotel);
  const careerWithScheduledEvents = { ...state.career, hotel: scheduled.bundle };

  const { state: nextCareer, report: dayReport } = await runCareerDay({ state: careerWithScheduledEvents, decisions, referenceDate, rng });

  // Storyline completion ratios as of the START of this month -- see
  // this file's header comment in buildMonthSnapshot()'s caller for why
  // the score can't depend on this month's own (not-yet-evaluated)
  // missions/objectives without a circular dependency.
  const missionsCompletedRatio = completionRatio(state.missions);
  const objectivesAchievedRatio = completionRatio(state.objectives);

  const snapshotBase = buildMonthSnapshot(nextCareer);
  const score = computeTfeScore({
    ebitdaMargin: snapshotBase.ebitdaMargin,
    occupancyRate: snapshotBase.occupancyRate,
    staffMorale: snapshotBase.staff.morale,
    marketingRoi: snapshotBase.marketing.roi,
    esgScore: snapshotBase.esg.score,
    housekeepingQuality: snapshotBase.housekeeping.quality,
    missionsCompletedRatio,
    objectivesAchievedRatio,
  });

  const monthSnapshot = { month: nextMonth, ...snapshotBase, score: { total: score } };

  const missionsAfterEval = evaluateTfeMissions(state.missions, monthSnapshot, nextMonth);
  const objectivesAfterEval = evaluateTfeObjectives(state.objectives, monthSnapshot);
  const chapterProgress = computeChapterProgress(nextMonth, state.horizonMonths, state.chapters);
  const risksAndOpportunities = computeRisksAndOpportunities(snapshotBase.moduleDiagnostics);

  const diagnostics = generateTfeDiagnostics({
    moduleDiagnostics: snapshotBase.moduleDiagnostics,
    score,
    cash: snapshotBase.finance.cash,
    month: nextMonth,
    horizonMonths: state.horizonMonths,
    chapterProgress,
    missionsCompletedCount: missionsAfterEval.filter((mission) => mission.achieved).length,
    missionsTotalCount: missionsAfterEval.length,
  });

  const performanceEntry = {
    month: nextMonth,
    score,
    ebitdaMargin: snapshotBase.ebitdaMargin,
    ebitda: snapshotBase.finance.ebitda,
    occupancyRate: snapshotBase.occupancyRate,
    esgScore: snapshotBase.esg.score,
    marketingRoi: snapshotBase.marketing.roi,
    housekeepingQuality: snapshotBase.housekeeping.quality,
    staffMorale: snapshotBase.staff.morale,
    staffOverload: snapshotBase.staff.overload,
    risks: risksAndOpportunities.risks,
    opportunities: risksAndOpportunities.opportunities,
  };

  const isCompleted = nextMonth >= state.horizonMonths;

  const nextStateWithoutForecast = createTfeState({
    ...state,
    status: isCompleted ? "completed" : "active",
    month: nextMonth,
    career: nextCareer,
    missions: missionsAfterEval,
    objectives: objectivesAfterEval,
    performanceHistory: [...safeArray(state.performanceHistory), performanceEntry],
    score: { total: score, grade: scoreGrade(score) },
    diagnostics,
    lastUpdated: new Date().toISOString(),
  });

  const forecast = generateTfeForecast(nextStateWithoutForecast);
  const nextState = { ...nextStateWithoutForecast, forecast };
  const finalState = isCompleted ? { ...nextState, report: generateTfeReport(nextState) } : nextState;

  return {
    state: finalState,
    monthReport: {
      dayReport,
      scheduledEvents: scheduled.triggered,
      performanceEntry,
      missionsJustCompleted: missionsJustCompleted(state.missions, missionsAfterEval),
    },
  };
}

// Applies a TFE action to the embedded career's own hotel bundle -- pure,
// the caller (hooks/useTfeEngine.js) is responsible for persisting the
// result (see lib/finance/financeEngine.js's applyFinancialDecision()
// for the same "pure transform, caller persists" contract).
export function applyTfeAction(tfeState, actionId, payload = {}) {
  const state = safeObject(tfeState);
  const nextHotelBundle = applyTfeDecision(state.career?.hotel, actionId, payload);
  return { ...state, career: { ...state.career, hotel: nextHotelBundle } };
}

// "replay complet (36 cycles)" / "analytics complet (36 cycles)"
// (section 1) -- the embedded career's own replayLog already records one
// entry per month played (see careerEngine.js's runCareerDay()), so this
// reuses the exact same Replay/Analytics adapters every other mode
// already does rather than maintaining a second parallel log.
export function buildTfeReplayRun(tfeState) {
  const state = safeObject(tfeState);
  const career = safeObject(state.career);
  return buildReplayRunFromCareerRun({
    playerId: career.playerId,
    replayLog: career.replayLog,
    scoreHistory: career.scoreHistory,
    status: career.status,
    day: career.day,
  });
}

export function analyzeTfeRun(tfeState) {
  return analyzeRun(buildTfeReplayRun(tfeState));
}

export function tfeDiagnosticsToAnalytics(tfeDiagnostics) {
  return safeArray(tfeDiagnostics).map((entry) => ({ type: entry.type, severity: entry.severity, message: entry.message, cycleIndex: null }));
}

export { TFE_ACTION_CATALOG, findTfeAction };

export const tfeEngine = {
  startTfe,
  playTfeMonth,
  applyTfeAction,
  buildTfeReplayRun,
  analyzeTfeRun,
  tfeDiagnosticsToAnalytics,
  findTfeAction,
  TFE_ACTION_CATALOG,
};
export default tfeEngine;
