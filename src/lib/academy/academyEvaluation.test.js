import { generateFinalReport } from "./academyEvaluation";
import { createScenarioTemplate } from "../scenario/scenarioSchema";
import { createReplayLog } from "../scenario/scenarioReplay";

function scenario() {
  return createScenarioTemplate("academie", { objectives: [{ id: "profit", kpi: "profit", comparator: "gte", target: 0 }] });
}

function finishedRun(scoreHistory) {
  return { status: "finished", cycleIndex: 5, totalCycles: 5, scoreHistory, objectivesStatus: { objectives: [] }, replayLog: createReplayLog() };
}

test("generateFinalReport averages scores across finished groups only", () => {
  const classEntry = { id: "c1", name: "Classe A" };
  const groups = [{ id: "g1", name: "Groupe A" }, { id: "g2", name: "Groupe B" }];
  const runsByGroupId = { g1: finishedRun([80]), g2: finishedRun([60]) };
  const assignment = { scenario: scenario() };

  const report = generateFinalReport(classEntry, groups, runsByGroupId, assignment);

  expect(report.completedCount).toBe(2);
  expect(report.classAverageScore).toBe(70);
  expect(report.bestGroup.groupId).toBe("g1");
  expect(report.worstGroup.groupId).toBe("g2");
});

test("generateFinalReport handles a group that hasn't finished yet", () => {
  const classEntry = { id: "c1", name: "Classe A" };
  const groups = [{ id: "g1", name: "Groupe A" }];
  const assignment = { scenario: scenario() };

  const report = generateFinalReport(classEntry, groups, {}, assignment);

  expect(report.completedCount).toBe(0);
  expect(report.classAverageScore).toBe(0);
  expect(report.groupReports[0].evaluation).toBeNull();
});
