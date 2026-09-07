// Integration test: analyticsEngine analyzes real Academy groups, compares
// them, and produces the teacher-facing group report -- exactly the
// section 6 requirement ("analyser les groupes, comparer les groupes,
// produire un rapport pour le professeur").
import { assignScenario } from "../academy/academyAssignments";
import { addGroup, createGroup } from "../academy/academyGroup";
import { createAcademyState } from "../academy/academyState";
import { runGroupCycle, finalizeGroup } from "../academy/academyEngine";
import { createScenarioTemplate } from "../scenario/scenarioSchema";
import { buildReplayRunFromAcademyGroup } from "../replay/replayEngine";
import { analyzeRun, compareRuns, generateGroupReport } from "./analyticsEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function scenario() {
  return createScenarioTemplate("academie", {
    objectives: [{ id: "profit", label: "Profit positif", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: 2 },
  });
}

function stateWithTwoGroups() {
  let state = createAcademyState();
  state = addGroup(state, createGroup({ id: "g1", classId: "c1", name: "Groupe A" }));
  state = addGroup(state, createGroup({ id: "g2", classId: "c1", name: "Groupe B" }));
  return assignScenario(state, { id: "a1", classId: "c1", scenario: scenario() });
}

async function playTwoGroups() {
  let state = stateWithTwoGroups();
  for (let i = 0; i < 2; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    ({ state } = await runGroupCycle({ state, groupId: "g1", referenceDate: REFERENCE_DATE, rng: () => 0.999 }));
    // eslint-disable-next-line no-await-in-loop
    ({ state } = await runGroupCycle({ state, groupId: "g2", referenceDate: REFERENCE_DATE, rng: () => 0.5 }));
  }
  return state;
}

test("analyzeRun analyzes a real Academy group's finished run", async () => {
  const state = await playTwoGroups();
  const { report: finalReport } = finalizeGroup(state, "g1");
  const group = state.groups.find((entry) => entry.id === "g1");
  const replayRun = buildReplayRunFromAcademyGroup(group, state.runsByGroupId.g1, finalReport);

  const analysis = analyzeRun(replayRun);
  expect(analysis.runId).toBe("academie-c1-g1");
  expect(analysis.kpis.profit).toBeDefined();
});

test("compareRuns compares two groups' real strategies", async () => {
  const state = await playTwoGroups();
  const groupA = state.groups.find((entry) => entry.id === "g1");
  const groupB = state.groups.find((entry) => entry.id === "g2");
  const analysisA = analyzeRun(buildReplayRunFromAcademyGroup(groupA, state.runsByGroupId.g1));
  const analysisB = analyzeRun(buildReplayRunFromAcademyGroup(groupB, state.runsByGroupId.g2));

  const comparison = compareRuns(analysisA, analysisB);
  expect(comparison.runA.label).toBe("Groupe A");
  expect(comparison.runB.label).toBe("Groupe B");
});

test("generateGroupReport ranks the whole class for the teacher", async () => {
  const state = await playTwoGroups();
  const groupA = state.groups.find((entry) => entry.id === "g1");
  const groupB = state.groups.find((entry) => entry.id === "g2");
  const analyses = [
    analyzeRun(buildReplayRunFromAcademyGroup(groupA, state.runsByGroupId.g1)),
    analyzeRun(buildReplayRunFromAcademyGroup(groupB, state.runsByGroupId.g2)),
  ];

  const report = generateGroupReport(analyses);
  expect(report.groupCount).toBe(2);
  expect(report.ranking).toHaveLength(2);
  expect(new Set(report.ranking.map((entry) => entry.rank))).toEqual(new Set([1, 2]));
});
