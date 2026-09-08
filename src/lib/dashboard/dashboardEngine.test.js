import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildReplayRunFromCareerRun } from "../replay/replayEngine";
import { analyzeRun } from "../analytics/analyticsEngine";
import { buildCareerSummary, buildDashboardState, buildReplaySummary, computeKpis } from "./dashboardEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function baseCareerState() {
  return startCareer({
    playerId: "player-1",
    hotelState: { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 1000 }, esg: {} },
    restaurantState: {
      finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
      menu: [{ price: 20, cost: 8, sales: 10 }],
      staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
      operations: [],
      marketing: { budget: 0 },
      esg: {},
    },
    rooms: [{ id: 1, number: "101", status: "libre", housekeeping_status: "clean" }],
    reservations: [{ id: 1, room_id: 1, client_name: "Ada", status: "confirmée", arrival: "2026-09-10", departure: "2026-09-12", price: 150 }],
  });
}

async function playedCareerState() {
  const state = baseCareerState();
  const { state: nextState } = await runCareerDay({ state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  return nextState;
}

test("computeKpis returns null before any day has been played", () => {
  expect(computeKpis(baseCareerState())).toBeNull();
});

test("computeKpis aggregates occupancy, pricing, revenue, satisfaction and staff from the last DailyReport", async () => {
  const state = await playedCareerState();
  const kpis = computeKpis(state);

  expect(kpis.occupancyRate).toBe(100); // 1 room, 1 occupied
  expect(kpis.averagePrice).toBe(150);
  expect(kpis.revenueToday).toBeGreaterThan(0);
  expect(kpis.staffCount).toBe(1);
  expect(kpis.date).toBe("2026-09-10");
});

test("buildReplaySummary returns null before any cycle exists", () => {
  expect(buildReplaySummary(baseCareerState())).toBeNull();
});

test("buildReplaySummary reconstructs the last cycle through the Replay adapters", async () => {
  const state = await playedCareerState();
  const summary = buildReplaySummary(state);

  expect(summary.cycleIndex).toBe(0);
  expect(summary.kpis.profit).toBeDefined();
  expect(Array.isArray(summary.events)).toBe(true);
});

test("buildReplaySummary matches what buildReplayRunFromCareerRun/getCycleForRun would produce directly", async () => {
  const state = await playedCareerState();
  const replayRun = buildReplayRunFromCareerRun({ playerId: state.playerId, replayLog: state.replayLog, scoreHistory: state.scoreHistory, status: state.status, day: state.day });
  const summary = buildReplaySummary(state);
  expect(summary.kpis.profit).toBe(replayRun.cycles[0].baseReport.profit);
});

test("buildCareerSummary surfaces missions/objectives/rewards/skills", () => {
  const summary = buildCareerSummary(baseCareerState());
  expect(summary.day).toBe(0);
  expect(summary.status).toBe("active");
  expect(Array.isArray(summary.acceptedMissions)).toBe(true);
  expect(summary.totalObjectives).toBeGreaterThan(0);
});

test("buildCareerSummary returns null without a career", () => {
  expect(buildCareerSummary(null)).toBeNull();
});

test("buildDashboardState assembles kpis, notifications, insights, quickActions, replaySummary and careerSummary", async () => {
  const state = await playedCareerState();
  const replayRun = buildReplayRunFromCareerRun({ playerId: state.playerId, replayLog: state.replayLog, scoreHistory: state.scoreHistory, status: state.status, day: state.day });
  const withAnalysis = { ...state, lastAnalysis: analyzeRun(replayRun) };

  const dashboardState = buildDashboardState({ careerState: withAnalysis, viewMode: "expert" });

  expect(dashboardState.viewMode).toBe("expert");
  expect(dashboardState.kpis.date).toBe("2026-09-10");
  expect(dashboardState.notifications).toEqual(expect.objectContaining({ problems: expect.any(Array), alerts: expect.any(Array), opportunities: expect.any(Array) }));
  expect(dashboardState.insights.hasInsights).toBe(true);
  expect(dashboardState.quickActions.length).toBeGreaterThan(0);
  expect(dashboardState.replaySummary).not.toBeNull();
  expect(dashboardState.careerSummary).not.toBeNull();
  expect(dashboardState.lastUpdated).not.toBeNull();
});

test("buildDashboardState falls back to the default view mode for an invalid one", () => {
  const dashboardState = buildDashboardState({ careerState: baseCareerState(), viewMode: "nonsense" });
  expect(dashboardState.viewMode).toBe("casual");
});
