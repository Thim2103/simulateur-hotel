// Integration test: a finished Academy group's run becomes a normalized,
// navigable replay -- exactly what useAcademy.js's generateFinalReport()
// wires up in production (see hooks/useAcademy.js).
import { assignScenario } from "../academy/academyAssignments";
import { addGroup, createGroup } from "../academy/academyGroup";
import { createAcademyState } from "../academy/academyState";
import { runGroupCycle, finalizeGroup } from "../academy/academyEngine";
import { createScenarioTemplate } from "../scenario/scenarioSchema";
import { buildReplayRunFromAcademyGroup, getCycleForRun } from "./replayEngine";
import { compareScoring } from "./replayComparison";

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

test("a finished group's run becomes a replay whose cycles carry the real daily reports", async () => {
  let state = stateWithTwoGroups();
  ({ state } = await runGroupCycle({ state, groupId: "g1", referenceDate: REFERENCE_DATE, rng: () => 0.999 }));
  ({ state } = await runGroupCycle({ state, groupId: "g1", referenceDate: REFERENCE_DATE, rng: () => 0.999 }));

  const { report: finalReport } = finalizeGroup(state, "g1");
  const group = state.groups.find((entry) => entry.id === "g1");
  const replayRun = buildReplayRunFromAcademyGroup(group, state.runsByGroupId.g1, finalReport);

  expect(replayRun.id).toBe("academie-c1-g1");
  expect(replayRun.source).toBe("academie");
  expect(replayRun.cycles).toHaveLength(2);
  expect(getCycleForRun(replayRun, 1).baseReport.date).toBe("2026-09-10");
  expect(replayRun.finalReport).toEqual(finalReport);
});

test("two groups' replays can be compared against each other once both are finished", async () => {
  let state = stateWithTwoGroups();
  for (let i = 0; i < 2; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    ({ state } = await runGroupCycle({ state, groupId: "g1", referenceDate: REFERENCE_DATE, rng: () => 0.999 }));
    // eslint-disable-next-line no-await-in-loop
    ({ state } = await runGroupCycle({ state, groupId: "g2", referenceDate: REFERENCE_DATE, rng: () => 0.5 }));
  }

  const groupA = state.groups.find((entry) => entry.id === "g1");
  const groupB = state.groups.find((entry) => entry.id === "g2");
  const replayA = buildReplayRunFromAcademyGroup(groupA, state.runsByGroupId.g1);
  const replayB = buildReplayRunFromAcademyGroup(groupB, state.runsByGroupId.g2);

  const scoring = compareScoring(replayA, replayB);
  expect(["a", "b", null]).toContain(scoring.leader);
  expect(scoring.a.label).toBe("Groupe A");
  expect(scoring.b.label).toBe("Groupe B");
});
