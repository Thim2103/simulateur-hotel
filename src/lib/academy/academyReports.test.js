import { buildClassReports, buildGroupReport, collectDailyReports } from "./academyReports";
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

test("buildGroupReport summarizes a group's current standing", () => {
  const report = buildGroupReport({ id: "g1", name: "Groupe A" }, runState());
  expect(report).toEqual(
    expect.objectContaining({
      groupId: "g1",
      groupName: "Groupe A",
      status: "running",
      cycleIndex: 2,
      totalCycles: 5,
      currentScore: 60,
    })
  );
  expect(report.objectives).toHaveLength(2);
});

test("buildGroupReport handles a group with no run yet", () => {
  const report = buildGroupReport({ id: "g1", name: "Groupe A" }, null);
  expect(report.status).toBe("not_started");
  expect(report.currentScore).toBeNull();
});

test("buildClassReports builds one report per group", () => {
  const groups = [{ id: "g1", name: "Groupe A" }, { id: "g2", name: "Groupe B" }];
  const runsByGroupId = { g1: runState() };
  const reports = buildClassReports(groups, runsByGroupId);
  expect(reports.map((report) => report.groupId)).toEqual(["g1", "g2"]);
  expect(reports[1].status).toBe("not_started");
});
