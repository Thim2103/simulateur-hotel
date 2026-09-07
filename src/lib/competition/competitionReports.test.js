import { buildMatchReports, buildPlayerReport, collectDailyReports } from "./competitionReports";
import { createReplayLog, recordCycle } from "../scenario/scenarioReplay";

function runState(overrides = {}) {
  return {
    status: "running",
    cycleIndex: 2,
    totalCycles: 5,
    scoreHistory: [40, 60],
    objectivesStatus: { objectives: [{ id: "o1", achieved: true }, { id: "o2", achieved: false }] },
    replayLog: createReplayLog(),
    ...overrides,
  };
}

test("collectDailyReports returns the run's replay entries in order", () => {
  let log = createReplayLog();
  log = recordCycle(log, { cycleIndex: 0 });
  log = recordCycle(log, { cycleIndex: 1 });
  expect(collectDailyReports({ replayLog: log }).map((entry) => entry.cycleIndex)).toEqual([0, 1]);
});

test("collectDailyReports never throws when there is no run yet", () => {
  expect(collectDailyReports(null)).toEqual([]);
});

test("buildPlayerReport summarizes a player's current standing", () => {
  const report = buildPlayerReport({ id: "p1", name: "Ada" }, runState());
  expect(report).toEqual(
    expect.objectContaining({ playerId: "p1", playerName: "Ada", status: "running", cycleIndex: 2, totalCycles: 5, currentScore: 60 })
  );
  expect(report.objectives).toHaveLength(2);
});

test("buildPlayerReport handles a player with no run yet", () => {
  const report = buildPlayerReport({ id: "p1", name: "Ada" }, null);
  expect(report.status).toBe("not_started");
  expect(report.currentScore).toBeNull();
});

test("buildMatchReports builds one report per player", () => {
  const players = [{ id: "p1", name: "Ada" }, { id: "p2", name: "Grace" }];
  const runsByPlayerId = { p1: runState() };
  const reports = buildMatchReports(players, runsByPlayerId);
  expect(reports.map((report) => report.playerId)).toEqual(["p1", "p2"]);
  expect(reports[1].status).toBe("not_started");
});
