import { assignScenario, trackAssignmentProgress } from "./academyAssignments";
import { addGroup, createGroup } from "./academyGroup";
import { createAcademyState } from "./academyState";
import { createScenarioTemplate } from "../scenario/scenarioSchema";

function scenario() {
  return createScenarioTemplate("academie", { objectives: [{ id: "profit", kpi: "profit", comparator: "gte", target: 0 }] });
}

function stateWithGroups() {
  let state = createAcademyState();
  state = addGroup(state, createGroup({ id: "g1", classId: "c1", name: "Groupe A" }));
  state = addGroup(state, createGroup({ id: "g2", classId: "c1", name: "Groupe B" }));
  return state;
}

test("assignScenario records the assignment and seeds one run per existing group", () => {
  const state = assignScenario(stateWithGroups(), { id: "a1", classId: "c1", scenario: scenario() });

  expect(state.assignments).toHaveLength(1);
  expect(state.runsByGroupId.g1).toBeDefined();
  expect(state.runsByGroupId.g2).toBeDefined();
  expect(state.runsByGroupId.g1.status).toBe("running");
});

test("assignScenario only seeds runs for groups in the target class", () => {
  let state = stateWithGroups();
  state = addGroup(state, createGroup({ id: "g3", classId: "other-class", name: "Groupe C" }));

  state = assignScenario(state, { id: "a1", classId: "c1", scenario: scenario() });

  expect(state.runsByGroupId.g3).toBeUndefined();
});

test("trackAssignmentProgress reports not_started for a group with no run yet", () => {
  const progress = trackAssignmentProgress(stateWithGroups(), "c1");
  expect(progress).toEqual([
    expect.objectContaining({ groupId: "g1", status: "not_started", currentScore: null }),
    expect.objectContaining({ groupId: "g2", status: "not_started", currentScore: null }),
  ]);
});

test("trackAssignmentProgress reflects a started run's cycle/score", () => {
  const state = assignScenario(stateWithGroups(), { id: "a1", classId: "c1", scenario: scenario() });
  const progress = trackAssignmentProgress(state, "c1");
  expect(progress[0]).toEqual(expect.objectContaining({ status: "running", cycleIndex: 0 }));
});
