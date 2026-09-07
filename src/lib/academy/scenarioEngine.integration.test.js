// Integration test: academyEngine really drives lib/scenario/scenarioEngine.js
// end to end for a class of groups, each with its own independent sandbox.
import { assignScenario } from "./academyAssignments";
import { addGroup, createGroup } from "./academyGroup";
import { createAcademyState } from "./academyState";
import { runGroupCycle, finalizeGroup } from "./academyEngine";
import { createScenarioTemplate } from "../scenario/scenarioSchema";

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

test("assignScenario seeds one independent scenarioEngine run per group", () => {
  const state = stateWithTwoGroups();
  expect(state.runsByGroupId.g1).not.toBe(state.runsByGroupId.g2);
  expect(state.runsByGroupId.g1.status).toBe("running");
  expect(state.runsByGroupId.g2.status).toBe("running");
});

test("playing a cycle for one group never advances the other group's run", async () => {
  let state = stateWithTwoGroups();
  ({ state } = await runGroupCycle({ state, groupId: "g1", referenceDate: REFERENCE_DATE, rng: () => 0.999 }));

  expect(state.runsByGroupId.g1.cycleIndex).toBe(1);
  expect(state.runsByGroupId.g2.cycleIndex).toBe(0);
});

test("a full class run: both groups play through scenarioEngine, sandboxed, to completion", async () => {
  let state = stateWithTwoGroups();

  for (let i = 0; i < 2; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    ({ state } = await runGroupCycle({ state, groupId: "g1", referenceDate: REFERENCE_DATE, rng: () => 0.999 }));
    // eslint-disable-next-line no-await-in-loop
    ({ state } = await runGroupCycle({ state, groupId: "g2", decisions: {}, referenceDate: REFERENCE_DATE, rng: () => 0.5 }));
  }

  expect(state.runsByGroupId.g1.status).toBe("finished");
  expect(state.runsByGroupId.g2.status).toBe("finished");

  const g1Final = finalizeGroup(state, "g1");
  const g2Final = finalizeGroup(g1Final.state, "g2");

  expect(g1Final.report).toEqual(expect.objectContaining({ finalScore: expect.any(Number), grade: expect.any(String) }));
  expect(g2Final.state.reportsByGroupId.g1).toBeDefined();
  expect(g2Final.state.reportsByGroupId.g2).toBeDefined();
});

test("scenario constraints are enforced per group through academyEngine", async () => {
  let state = createAcademyState();
  state = addGroup(state, createGroup({ id: "g1", classId: "c1", name: "Groupe A" }));
  state = assignScenario(state, { id: "a1", classId: "c1", scenario: scenario() });
  // Re-assign with a pricing constraint to prove academyEngine forwards it through to scenarioConstraints.
  const constrained = scenario();
  constrained.constraints = { pricing: { maxADR: 100 } };
  state = assignScenario(state, { id: "a2", classId: "c1", scenario: constrained });

  const { report, state: nextState } = await runGroupCycle({ state, groupId: "g1", decisions: { pricingADR: 500 }, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(report.blocked).toBe(true);
  expect(nextState.runsByGroupId.g1.cycleIndex).toBe(0);
});
