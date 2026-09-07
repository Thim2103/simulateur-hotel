import { compareGroups, compareObjectives } from "./academyComparison";
import { createReplayLog } from "../scenario/scenarioReplay";

function group(id, name) {
  return { id, name };
}

function run(score, objectives) {
  return { status: "running", cycleIndex: 1, totalCycles: 5, scoreHistory: [score], objectivesStatus: { objectives }, replayLog: createReplayLog() };
}

test("compareGroups ranks groups by current score, highest first", () => {
  const groups = [group("g1", "A"), group("g2", "B")];
  const runsByGroupId = { g1: run(40, []), g2: run(90, []) };

  const ranking = compareGroups(groups, runsByGroupId);
  expect(ranking.map((entry) => entry.groupId)).toEqual(["g2", "g1"]);
  expect(ranking[0].rank).toBe(1);
});

test("compareGroups puts not-yet-started groups last", () => {
  const groups = [group("g1", "A"), group("g2", "B")];
  const runsByGroupId = { g1: run(40, []) };

  const ranking = compareGroups(groups, runsByGroupId);
  expect(ranking.map((entry) => entry.groupId)).toEqual(["g1", "g2"]);
});

test("compareGroups counts achieved objectives per group", () => {
  const groups = [group("g1", "A")];
  const runsByGroupId = { g1: run(50, [{ id: "o1", achieved: true }, { id: "o2", achieved: false }]) };

  expect(compareGroups(groups, runsByGroupId)[0]).toEqual(expect.objectContaining({ objectivesAchieved: 1, objectivesTotal: 2 }));
});

test("compareObjectives reports how many groups achieved each objective", () => {
  const groups = [group("g1", "A"), group("g2", "B")];
  const runsByGroupId = {
    g1: run(50, [{ id: "profit", achieved: true, current: 100 }]),
    g2: run(30, [{ id: "profit", achieved: false, current: -10 }]),
  };

  const breakdown = compareObjectives(groups, runsByGroupId);
  expect(breakdown).toEqual([expect.objectContaining({ objectiveId: "profit", achievedCount: 1, totalGroups: 2 })]);
});
