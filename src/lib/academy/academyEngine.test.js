import { finalizeGroup, initScenarioRunForGroup, runGroupBatch, runGroupCycle } from "./academyEngine";
import { assignScenario } from "./academyAssignments";
import { addGroup, createGroup } from "./academyGroup";
import { createAcademyState } from "./academyState";
import { createScenarioTemplate } from "../scenario/scenarioSchema";
import { defaultHotelState } from "../hotel";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function scenario(overrides = {}) {
  return createScenarioTemplate("academie", {
    objectives: [{ id: "profit", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: 2 },
    ...overrides,
  });
}

function stateWithAssignedGroup() {
  let state = createAcademyState();
  state = addGroup(state, createGroup({ id: "g1", classId: "c1", name: "Groupe A" }));
  state = assignScenario(state, { id: "a1", classId: "c1", scenario: scenario() });
  return state;
}

test("runGroupCycle throws for a group with no active run", async () => {
  await expect(runGroupCycle({ state: createAcademyState(), groupId: "missing" })).rejects.toThrow(/Aucun scénario/);
});

test("runGroupCycle plays one sandboxed cycle and updates only that group's run", async () => {
  const state = stateWithAssignedGroup();
  const { report, state: nextState } = await runGroupCycle({ state, groupId: "g1", referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(report.baseReport.date).toBe("2026-09-10");
  expect(nextState.runsByGroupId.g1.cycleIndex).toBe(1);
});

test("initScenarioRunForGroup seeds a run for a group added after assignment", () => {
  let state = stateWithAssignedGroup();
  state = addGroup(state, createGroup({ id: "g2", classId: "c1", name: "Groupe B" }));
  expect(state.runsByGroupId.g2).toBeUndefined();

  state = initScenarioRunForGroup(state, "g2", scenario());
  expect(state.runsByGroupId.g2.status).toBe("running");
});

test("runGroupBatch plays several cycles for one group without touching others", async () => {
  let state = stateWithAssignedGroup();
  state = addGroup(state, createGroup({ id: "g2", classId: "c1", name: "Groupe B" }));
  state = initScenarioRunForGroup(state, "g2", scenario());

  const { reports, state: nextState } = await runGroupBatch({ state, groupId: "g1", cycles: 2, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(reports).toHaveLength(2);
  expect(nextState.runsByGroupId.g1.status).toBe("finished");
  expect(nextState.runsByGroupId.g2.cycleIndex).toBe(0); // untouched
});

test("finalizeGroup grades the run and stores the final report", async () => {
  let state = stateWithAssignedGroup();
  ({ state } = await runGroupBatch({ state, groupId: "g1", cycles: 2, referenceDate: REFERENCE_DATE, rng: () => 0.999 }));

  const { report, state: finalState } = finalizeGroup(state, "g1");

  expect(report).toEqual(expect.objectContaining({ finalScore: expect.any(Number), grade: expect.any(String) }));
  expect(finalState.reportsByGroupId.g1).toEqual(report);
});

test("a group's sandboxed run never touches the shared defaultHotelState object", async () => {
  const before = JSON.stringify(defaultHotelState);
  const state = stateWithAssignedGroup();
  await runGroupCycle({ state, groupId: "g1", referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  expect(JSON.stringify(defaultHotelState)).toBe(before);
});
