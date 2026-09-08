// Integration tests: dashboardEngine.js against the real career/replay/
// analytics engines (no mocks) -- proves the Dashboard's aggregation
// stays correct end to end, not just against hand-built fixtures (see
// dashboardEngine.test.js for the fixture-based unit tests).
import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildReplayRunFromCareerRun, getCycleForRun } from "../replay/replayEngine";
import { analyzeRun } from "../analytics/analyticsEngine";
import { buildDashboardState, buildReplaySummary, computeKpis } from "./dashboardEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function seededCareer() {
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
    rooms: [
      { id: 1, number: "101", status: "libre", housekeeping_status: "clean" },
      { id: 2, number: "102", status: "libre", housekeeping_status: "clean" },
    ],
    reservations: [
      { id: 1, room_id: 1, client_name: "Ada", status: "confirmée", arrival: "2026-09-10", departure: "2026-09-12", price: 150 },
    ],
  });
}

test("careerEngine + dashboardEngine: KPIs computed from a real runCareerDay() report", async () => {
  const career = seededCareer();
  const { state: playedCareer } = await runCareerDay({ state: career, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  const kpis = computeKpis(playedCareer);

  // 1 of 2 rooms occupied.
  expect(kpis.occupancyRate).toBe(50);
  expect(kpis.averagePrice).toBe(150);
  expect(kpis.profit).toBe(playedCareer.lastDayReport.profit);
  expect(kpis.staffCount).toBe(1);
});

test("replayEngine + dashboardEngine: buildReplaySummary matches the run's own replay cycle", async () => {
  const career = seededCareer();
  const { state: playedCareer } = await runCareerDay({ state: career, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  const replayRun = buildReplayRunFromCareerRun({
    playerId: playedCareer.playerId,
    replayLog: playedCareer.replayLog,
    scoreHistory: playedCareer.scoreHistory,
    status: playedCareer.status,
    day: playedCareer.day,
  });
  const expectedCycle = getCycleForRun(replayRun, 0);

  const summary = buildReplaySummary(playedCareer);

  expect(summary.kpis.score).toBe(expectedCycle.score);
  expect(summary.events).toEqual(expectedCycle.scenarioEvents);
  expect(summary.decisions).toEqual(expectedCycle.decisions);
});

test("analyticsEngine + dashboardEngine: insights/notifications reflect a real Analysis object", async () => {
  const career = seededCareer();
  const { state: playedCareer } = await runCareerDay({ state: career, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  const replayRun = buildReplayRunFromCareerRun({
    playerId: playedCareer.playerId,
    replayLog: playedCareer.replayLog,
    scoreHistory: playedCareer.scoreHistory,
    status: playedCareer.status,
    day: playedCareer.day,
  });
  const analysis = analyzeRun(replayRun);
  const careerWithAnalysis = { ...playedCareer, lastAnalysis: analysis };

  const dashboardState = buildDashboardState({ careerState: careerWithAnalysis, viewMode: "casual" });

  expect(dashboardState.insights.diagnostics).toEqual(analysis.diagnostics);
  expect(dashboardState.insights.recommendations).toEqual(analysis.recommendations);
  // Every "error"-typed diagnostic from Analytics should have landed in
  // the "problems" bucket alongside any rule-based ones.
  const errorCount = analysis.diagnostics.filter((d) => d.type === "error").length;
  const analyticsProblemCount = dashboardState.notifications.problems.filter((n) => n.source === "analytics").length;
  expect(analyticsProblemCount).toBe(errorCount);
});
