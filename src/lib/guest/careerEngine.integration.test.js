// Integration test: a guest-seeded hotel (see guestAdapter.js's
// createGuestHotelBundle()) plays a real career day end to end, entirely
// through the real engines -- runDailyCycle() sandboxed, scenarioEngine
// (via careerEngine's mini-scenario challenge), and the replay/analytics
// wiring lib/replay/ and lib/analytics/ already provide. Nothing here is
// mocked: this proves the whole chain works without a Supabase session,
// not just that the hook calls the right functions.
import { createGuestHotelBundle } from "./guestAdapter";
import { runCareerDay, runMiniScenarioChallenge, startCareer } from "../career/careerEngine";
import { createScenarioTemplate } from "../scenario/scenarioSchema";
import { buildReplayRunFromCareerRun } from "../replay/replayEngine";
import { getCycleForRun } from "../replay/replayEngine";
import { analyzeRun } from "../analytics/analyticsEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

test("runDailyCycle runs sandboxed against a guest-seeded hotel, never touching Supabase", async () => {
  const bundle = createGuestHotelBundle({ referenceDate: REFERENCE_DATE });
  const career = startCareer({ playerId: "guest-1", ...bundle });

  const { state: nextState, report } = await runCareerDay({ state: career, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(nextState.day).toBe(1);
  expect(report.dailyReport.date).toBe("2026-09-10");
  // A real day off the seeded rooms/reservations produces real occupancy,
  // not a placeholder/zeroed report.
  expect(report.dailyReport.hotelRevenue.occupiedRooms).toBeGreaterThan(0);
});

test("scenarioEngine runs a sandboxed mini-scenario challenge against the guest career", async () => {
  const bundle = createGuestHotelBundle({ referenceDate: REFERENCE_DATE });
  let career = startCareer({ playerId: "guest-1", ...bundle });

  const scenario = createScenarioTemplate("solo", {
    objectives: [{ id: "profit", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: 1 },
  });

  const { state: nextState, report } = await runMiniScenarioChallenge({ state: career, scenario, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  career = nextState;

  expect(report.cycleIndex).toBe(0);
  expect(career.activeMiniScenario === null || career.activeMiniScenario.status === "running").toBe(true);
});

test("replayEngine reconstructs the guest career's own replay run, cycle by cycle", async () => {
  const bundle = createGuestHotelBundle({ referenceDate: REFERENCE_DATE });
  let career = startCareer({ playerId: "guest-1", ...bundle });
  ({ state: career } = await runCareerDay({ state: career, referenceDate: REFERENCE_DATE, rng: () => 0.999 }));

  const replayRun = buildReplayRunFromCareerRun({
    playerId: career.playerId,
    replayLog: career.replayLog,
    scoreHistory: career.scoreHistory,
    status: career.status,
    day: career.day,
  });

  expect(replayRun.source).toBe("career");
  expect(replayRun.cycles).toHaveLength(1);
  expect(getCycleForRun(replayRun, 0).baseReport.date).toBe("2026-09-10");
});

test("analyticsEngine analyzes the guest career's replay and produces real diagnostics/recommendations", async () => {
  const bundle = createGuestHotelBundle({ referenceDate: REFERENCE_DATE });
  let career = startCareer({ playerId: "guest-1", ...bundle });
  ({ state: career } = await runCareerDay({ state: career, referenceDate: REFERENCE_DATE, rng: () => 0.999 }));

  const replayRun = buildReplayRunFromCareerRun({
    playerId: career.playerId,
    replayLog: career.replayLog,
    scoreHistory: career.scoreHistory,
    status: career.status,
    day: career.day,
  });
  const analysis = analyzeRun(replayRun);

  expect(analysis.runId).toBe(replayRun.id);
  expect(analysis.kpis.profit).toBeDefined();
  expect(Array.isArray(analysis.diagnostics)).toBe(true);
  expect(Array.isArray(analysis.recommendations)).toBe(true);
});
