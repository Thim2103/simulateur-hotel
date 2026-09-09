// Orchestrates the Professional Solo mode: a self-contained 24-month
// playthrough that drives its own embedded CareerState (see
// lib/career/careerEngine.js) directly -- never through
// context/CareerContext.jsx, so a Pro run never mixes with the player's
// regular Solo/Carrière save -- and layers every business module's own
// per-cycle engine on top of each month played, including the two
// Advanced modules (RestaurantAdvanced/RmAdvanced) and Clients, on top
// of what lib/tfe/tfeEngine.js already does for Finance/Staff/
// Marketing/ESG/Housekeeping. Same architecture as tfeEngine.js, richer
// integration surface.
import { safeArray, safeObject } from "../safe";
import { startCareer as startCareerEngine, runCareerDay } from "../career/careerEngine";
import { buildReplayRunFromCareerRun } from "../replay/replayEngine";
import { analyzeRun } from "../analytics/analyticsEngine";
import { financeFromCareerState } from "../finance/financeEngine";
import { staffFromCareerState } from "../staff/staffEngine";
import { marketingFromCareerState } from "../marketing/marketingEngine";
import { esgFromCareerState } from "../esg/esgEngine";
import { housekeepingFromCareerState } from "../housekeeping/housekeepingEngine";
import { restaurantAdvancedFromCareerState } from "../restaurantAdvanced/restaurantAdvancedEngine";
import { rmAdvancedFromCareerState } from "../rmAdvanced/rmAdvancedEngine";
import { clientsFromCareerState } from "../clients/clientsEngine";
import { applyScheduledEvents, createProHotelBundle } from "./proScenario";
import { computeCrises, estimateCrisisImpact } from "./proCrises";
import { computeOpportunities } from "./proOpportunities";
import { runProAudits } from "./proAudits";
import {
  computePhaseProgress,
  evaluateProMissions,
  missionsJustCompleted,
  seedPhases,
  seedProMissions,
} from "./proMissions";
import { evaluateProObjectives, seedProObjectives } from "./proObjectives";
import { computeDepartmentScores, computeEbitdaMargin, computeProScore, computeRisksAndOpportunities, scoreGrade } from "./proScore";
import { generateProDiagnostics } from "./proDiagnostics";
import { generateProForecast } from "./proForecast";
import { generateProReport } from "./proReport";
import { applyProDecision, findProAction, PRO_ACTION_CATALOG } from "./proActions";
import { createProState } from "./proState";

// Builds the flat "month snapshot" every business module's own cycle
// feeds into -- read by proMissions.js's evaluateProMissions()/
// proObjectives.js's evaluateProObjectives() (dotted KPI paths) and by
// proScore.js/proAudits.js/proDiagnostics.js.
function buildMonthSnapshot(careerState) {
  const finance = financeFromCareerState(careerState);
  const staff = staffFromCareerState(careerState);
  const marketing = marketingFromCareerState(careerState);
  const esg = esgFromCareerState(careerState);
  const housekeeping = housekeepingFromCareerState(careerState);
  const restaurantAdvanced = restaurantAdvancedFromCareerState(careerState);
  const rmAdvanced = rmAdvancedFromCareerState(careerState);
  const clients = clientsFromCareerState(careerState);

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
    ...safeArray(restaurantAdvanced.diagnostics),
    ...safeArray(rmAdvanced.diagnostics),
    ...safeArray(clients.diagnostics),
  ];

  return {
    occupancyRate,
    ebitdaMargin,
    finance: { ebitda: finance.incomeStatement.ebitda, revenue: finance.incomeStatement.revenues.total, netIncome: finance.incomeStatement.netIncome, cash: finance.balanceSheet.assets.cash },
    staff: { morale: staff.morale, overload: staff.overload, absenteeism: staff.absenteeism, productivity: staff.productivity },
    marketing: { roi: marketing.roi.overallRoi, reputation: marketing.reputation },
    esg: { score: esg.score },
    housekeeping: { quality: housekeeping.quality, overload: housekeeping.overload },
    restaurantAdvanced: { grossMargin: restaurantAdvanced.profitability?.grossMargin ?? 60, foodCost: restaurantAdvanced.foodCost?.overall ?? 30 },
    rmAdvanced: { avgCompression: rmAdvanced.compression?.avgCompression ?? 55, otaShare: rmAdvanced.otaStrategy?.otaShare ?? 40, directShare: rmAdvanced.otaStrategy?.directShare ?? 40 },
    clients: { satisfaction: clients.satisfaction ?? 65, loyalty: clients.loyalty ?? 50 },
    moduleDiagnostics,
  };
}

function completionRatio(items) {
  const list = safeArray(items);
  if (!list.length) return 0;
  return list.filter((item) => item.achieved).length / list.length;
}

// 1. "choix du type d'hôtel / positionnement / stratégie professionnelle"
// section: builds the hotel bundle from the player's own choices and
// starts the embedded career against it.
export function startPro({ playerId, hotelConfig, referenceDate = new Date() } = {}) {
  const hotelBundle = createProHotelBundle({ ...safeObject(hotelConfig), referenceDate });
  const career = startCareerEngine({ playerId, ...hotelBundle });

  return createProState({
    proId: `pro-${Date.now()}`,
    playerId,
    status: "active",
    hotelConfig,
    month: 0,
    horizonMonths: 24,
    career,
    phases: seedPhases(),
    missions: seedProMissions(),
    objectives: seedProObjectives(),
    crises: [],
    opportunities: [],
    audits: [],
    performanceHistory: [],
    score: null,
    diagnostics: [],
    forecast: null,
    report: null,
    lastUpdated: new Date().toISOString(),
  });
}

// Plays one month: applies this month's scripted timeline event(s) (if
// any, see proScenario.js's PRO_TIMELINE), advances the embedded career
// by one day (one "month" tick, same convention as tfeEngine.js), then
// recomputes every business module's own cycle, crises/opportunities/
// audits, the Pro score, the storyline, and (once the horizon is
// reached) the final report.
export async function playProMonth({ proState, decisions = {}, referenceDate = new Date(), rng = Math.random } = {}) {
  const state = safeObject(proState);
  if (state.status !== "active") return { state: proState, monthReport: null };

  const nextMonth = state.month + 1;
  const scheduled = applyScheduledEvents(nextMonth, state.career.hotel);
  const careerWithScheduledEvents = { ...state.career, hotel: scheduled.bundle };

  const { state: nextCareer, report: dayReport } = await runCareerDay({ state: careerWithScheduledEvents, decisions, referenceDate, rng });

  // Storyline completion ratios as of the START of this month -- same
  // "no circular dependency" reasoning as tfeEngine.js's own
  // buildMonthSnapshot() caller.
  const missionsCompletedRatio = completionRatio(state.missions);
  const objectivesAchievedRatio = completionRatio(state.objectives);

  const snapshotBase = buildMonthSnapshot(nextCareer);

  const crises = computeCrises({ triggeredThisMonth: scheduled.triggered, previousCrises: state.crises, month: nextMonth });
  const opportunities = computeOpportunities({
    triggeredThisMonth: scheduled.triggered,
    previousOpportunities: state.opportunities,
    month: nextMonth,
    seizedIds: safeArray(decisions.seizedOpportunityIds),
  });
  const crisisImpact = estimateCrisisImpact(crises);

  const scoreInputs = {
    ebitdaMargin: snapshotBase.ebitdaMargin,
    occupancyRate: snapshotBase.occupancyRate,
    rmDirectShare: snapshotBase.rmAdvanced.directShare,
    fbGrossMargin: snapshotBase.restaurantAdvanced.grossMargin,
    staffMorale: snapshotBase.staff.morale,
    marketingReputation: snapshotBase.marketing.reputation,
    esgScore: snapshotBase.esg.score,
    housekeepingQuality: snapshotBase.housekeeping.quality,
    clientsSatisfaction: snapshotBase.clients.satisfaction,
  };
  const score = computeProScore({ ...scoreInputs, missionsCompletedRatio, objectivesAchievedRatio, crisisScorePenalty: crisisImpact.scorePenalty });
  const departmentScores = computeDepartmentScores(scoreInputs);

  const monthSnapshot = { month: nextMonth, ...snapshotBase, score: { total: score }, departmentScores };

  const missionsAfterEval = evaluateProMissions(state.missions, monthSnapshot, nextMonth);
  const objectivesAfterEval = evaluateProObjectives(state.objectives, monthSnapshot);
  const phaseProgress = computePhaseProgress(nextMonth, state.horizonMonths, state.phases);
  const risksAndOpportunities = computeRisksAndOpportunities(snapshotBase.moduleDiagnostics);
  const auditsThisMonth = runProAudits(monthSnapshot).map((audit) => ({ ...audit, month: nextMonth }));

  const diagnostics = generateProDiagnostics({
    moduleDiagnostics: snapshotBase.moduleDiagnostics,
    score,
    cash: snapshotBase.finance.cash,
    month: nextMonth,
    horizonMonths: state.horizonMonths,
    phaseProgress,
    missionsCompletedCount: missionsAfterEval.filter((mission) => mission.achieved).length,
    missionsTotalCount: missionsAfterEval.length,
    activeCrisesCount: crisisImpact.count,
    auditFailures: auditsThisMonth.filter((audit) => audit.grade === "D" || audit.grade === "F"),
  });

  const performanceEntry = {
    month: nextMonth,
    score,
    ebitdaMargin: snapshotBase.ebitdaMargin,
    ebitda: snapshotBase.finance.ebitda,
    occupancyRate: snapshotBase.occupancyRate,
    esgScore: snapshotBase.esg.score,
    marketingReputation: snapshotBase.marketing.reputation,
    housekeepingQuality: snapshotBase.housekeeping.quality,
    staffMorale: snapshotBase.staff.morale,
    staffOverload: snapshotBase.staff.overload,
    rmDirectShare: snapshotBase.rmAdvanced.directShare,
    fbGrossMargin: snapshotBase.restaurantAdvanced.grossMargin,
    clientsSatisfaction: snapshotBase.clients.satisfaction,
    departmentScores,
    risks: risksAndOpportunities.risks,
    opportunities: risksAndOpportunities.opportunities,
  };

  const isCompleted = nextMonth >= state.horizonMonths;

  const nextStateWithoutForecast = createProState({
    ...state,
    status: isCompleted ? "completed" : "active",
    month: nextMonth,
    career: nextCareer,
    crises,
    opportunities,
    audits: [...safeArray(state.audits), ...auditsThisMonth],
    missions: missionsAfterEval,
    objectives: objectivesAfterEval,
    performanceHistory: [...safeArray(state.performanceHistory), performanceEntry],
    score: { total: score, grade: scoreGrade(score) },
    diagnostics,
    lastUpdated: new Date().toISOString(),
  });

  const forecast = generateProForecast(nextStateWithoutForecast);
  const nextState = { ...nextStateWithoutForecast, forecast };
  const finalState = isCompleted ? { ...nextState, report: generateProReport(nextState) } : nextState;

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

// Applies a Pro action to the embedded career's own hotel bundle --
// pure, the caller (hooks/useProEngine.js) is responsible for persisting
// the result -- same "pure transform, caller persists" contract as
// tfeEngine.js's applyTfeAction().
export function applyProAction(proState, actionId, payload = {}) {
  const state = safeObject(proState);
  const nextHotelBundle = applyProDecision(state.career?.hotel, actionId, payload);
  return { ...state, career: { ...state.career, hotel: nextHotelBundle } };
}

// "replay complet (24 cycles)" / "analytics complet (24 cycles)" -- the
// embedded career's own replayLog already records one entry per month
// played (see careerEngine.js's runCareerDay()), so this reuses the
// exact same Replay/Analytics adapters every other mode already does
// rather than maintaining a second parallel log -- same reuse as
// tfeEngine.js's buildTfeReplayRun()/analyzeTfeRun().
export function buildProReplayRun(proState) {
  const state = safeObject(proState);
  const career = safeObject(state.career);
  return buildReplayRunFromCareerRun({
    playerId: career.playerId,
    replayLog: career.replayLog,
    scoreHistory: career.scoreHistory,
    status: career.status,
    day: career.day,
  });
}

export function analyzeProRun(proState) {
  return analyzeRun(buildProReplayRun(proState));
}

export function proDiagnosticsToAnalytics(proDiagnostics) {
  return safeArray(proDiagnostics).map((entry) => ({ type: entry.type, severity: entry.severity, message: entry.message, cycleIndex: null }));
}

export { PRO_ACTION_CATALOG, findProAction };

export const proEngine = {
  startPro,
  playProMonth,
  applyProAction,
  buildProReplayRun,
  analyzeProRun,
  proDiagnosticsToAnalytics,
  findProAction,
  PRO_ACTION_CATALOG,
};
export default proEngine;
