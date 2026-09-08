// Orchestrates the Dashboard: given the player's own CareerState (see
// lib/career/careerState.js -- already synced with runDailyCycle, the
// Scenario/Replay/Analytics engines via useCareer.js), builds everything
// Dashboard.jsx needs in one call. Nothing here talks to Supabase or
// re-simulates anything; it only reads and reshapes state that other
// engines already computed.
import { safeArray, safeNumber, safeObject } from "../safe";
import { buildReplayRunFromCareerRun, getCycleForRun } from "../replay/replayEngine";
import { kpisForCycle } from "../replay/replayKpis";
import { eventsForCycle } from "../replay/replayEvents";
import { decisionsForCycle } from "../replay/replayTimeline";
import { createDashboardState } from "./dashboardState";
import { buildNotifications } from "./dashboardNotifications";
import { buildInsights } from "./dashboardInsights";
import { QUICK_ACTION_CATALOG, applyQuickAction as applyQuickActionPure } from "./dashboardActions";
import { normalizeViewMode } from "./dashboardViewMode";
import { financeFromCareerState } from "../finance/financeEngine";

// KPI aggregation: occupation, avg price / ADR, revenue, satisfaction,
// staff -- pulled from today's DailyReport (careerState.lastDayReport,
// see lib/dailyCycle/runDailyCycle.js's buildDailyReport()) and the
// player's own room count (careerState.hotel.rooms).
export function computeKpis(careerState) {
  const dailyReport = careerState?.lastDayReport;
  if (!dailyReport) return null;

  const totalRooms = safeArray(careerState?.hotel?.rooms).length;
  const occupiedRooms = safeNumber(dailyReport.hotelRevenue?.occupiedRooms, 0);
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const averagePrice = occupiedRooms > 0 ? Math.round(safeNumber(dailyReport.hotelRevenue?.roomRevenue, 0) / occupiedRooms) : 0;
  const adr = safeNumber(dailyReport.rmReport?.pricing?.recommendedADR, averagePrice);

  const restaurantReport = safeObject(dailyReport.restaurantReport);
  const staff = safeObject(restaurantReport.staff);

  // GOPPAR/EBITDA -- lib/finance/financeEngine.js's own income statement,
  // computed fresh from the same hotel bundle (pure, no persistence of
  // its own here; the Finance module's own hooks/useFinance.js is what
  // actually persists a finance cycle -- see its docstring).
  const finance = careerState?.hotel ? financeFromCareerState(careerState) : null;

  return {
    occupancyRate,
    averagePrice,
    adr,
    revenueToday: Math.round(safeNumber(dailyReport.hotelRevenue?.netRevenue, 0) + safeNumber(dailyReport.restaurantRevenue?.netRevenue, 0)),
    profit: safeNumber(dailyReport.profit, 0),
    satisfaction: safeNumber(restaurantReport.customerSatisfaction, null),
    staffCount: safeNumber(staff.headcount, 0),
    staffSatisfaction: safeNumber(staff.satisfactionAvg, null),
    reputation: safeNumber(dailyReport.progressionReport?.reputation, null),
    ebitda: finance ? finance.incomeStatement.ebitda : null,
    goppar: finance ? finance.ratios.goppar : null,
    date: dailyReport.date,
  };
}

// "Résumé du jour précédent" -- reconstructs the last recorded cycle
// through the same Replay adapters ReplayViewer.jsx uses, so this stays
// consistent with the rest of the Replay module rather than reading
// careerState.lastDayReport a second, differently-shaped way.
export function buildReplaySummary(careerState) {
  const cycles = safeArray(careerState?.replayLog?.entries);
  if (cycles.length === 0) return null;

  const replayRun = buildReplayRunFromCareerRun({
    playerId: careerState.playerId,
    replayLog: careerState.replayLog,
    scoreHistory: careerState.scoreHistory,
    status: careerState.status,
    day: careerState.day,
  });
  const lastCycleIndex = cycles.length - 1;
  const cycle = getCycleForRun(replayRun, lastCycleIndex);
  if (!cycle) return null;

  return {
    cycleIndex: lastCycleIndex,
    kpis: kpisForCycle(cycle),
    events: eventsForCycle(cycle),
    decisions: decisionsForCycle(cycle),
  };
}

// Progression/missions/objectives/rewards snapshot -- the same figures
// CareerDashboard.jsx shows, surfaced here too so the general Dashboard
// doesn't require a detour through /career to see where the player stands.
export function buildCareerSummary(careerState) {
  if (!careerState) return null;
  const missions = safeArray(careerState.missions);
  const objectives = safeArray(careerState.objectives);
  return {
    day: careerState.day,
    status: careerState.status,
    acceptedMissions: missions.filter((mission) => mission.status === "accepted"),
    completedMissionsCount: missions.filter((mission) => mission.status === "completed").length,
    achievedObjectivesCount: objectives.filter((objective) => objective.achieved).length,
    totalObjectives: objectives.length,
    pendingRewardsCount: safeArray(careerState.rewardsInbox).length,
    skills: safeObject(careerState.skills),
  };
}

// Builds the full DashboardState (see dashboardState.js) from the current
// CareerState -- the one function useDashboard.js's loadDashboardState()
// calls. viewMode is passed through unchanged (it's a stored preference,
// not derived from the hotel).
export function buildDashboardState({ careerState, viewMode } = {}) {
  const kpis = computeKpis(careerState);
  const diagnostics = careerState?.lastAnalysis?.diagnostics;
  const insights = buildInsights(careerState?.lastAnalysis);

  return createDashboardState({
    viewMode: normalizeViewMode(viewMode),
    kpis,
    notifications: buildNotifications({ kpis, diagnostics }),
    insights,
    quickActions: QUICK_ACTION_CATALOG,
    replaySummary: buildReplaySummary(careerState),
    careerSummary: buildCareerSummary(careerState),
    lastUpdated: new Date().toISOString(),
  });
}

// Re-exported so callers only need to import from dashboardEngine.js /
// index.js, same convention as lib/career/careerEngine.js.
export function applyQuickAction(hotelBundle, actionId, payload = {}) {
  return applyQuickActionPure(hotelBundle, actionId, payload);
}

export const dashboardEngine = {
  computeKpis,
  buildReplaySummary,
  buildCareerSummary,
  buildDashboardState,
  applyQuickAction,
};
export default dashboardEngine;
