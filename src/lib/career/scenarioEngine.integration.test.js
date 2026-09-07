// Integration test: careerEngine's mini-scenario challenge really drives
// lib/scenario/scenarioEngine.js, sandboxed, for a bounded "mini-cas
// pratique" -- section 6 of the request.
import { runMiniScenarioChallenge, startCareer } from "./careerEngine";
import { createScenarioTemplate } from "../scenario/scenarioSchema";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function baseState() {
  return startCareer({
    hotelState: { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 } },
    restaurantState: { finance: { revenue: [0], costs: [0], months: {} }, menu: [], staff: [], operations: [] },
    rooms: [],
    reservations: [],
  });
}

function pricingScenario(overrides = {}) {
  return createScenarioTemplate("solo", {
    objectives: [{ id: "profit", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: 2 },
    constraints: { pricing: { maxADR: 200 } },
    ...overrides,
  });
}

test("runMiniScenarioChallenge starts a real ScenarioRunState from the career's current hotel", async () => {
  const state = baseState();
  const { state: nextState } = await runMiniScenarioChallenge({ state, scenario: pricingScenario(), referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  expect(nextState.activeMiniScenario).toEqual(expect.objectContaining({ cycleIndex: 1, totalCycles: 2, status: "running" }));
});

test("runMiniScenarioChallenge enforces the scenario's own constraints (a blocked decision produces no cycle)", async () => {
  const state = baseState();
  const { report, state: nextState } = await runMiniScenarioChallenge({
    state,
    scenario: pricingScenario(),
    decisions: { pricingADR: 500 },
    referenceDate: REFERENCE_DATE,
    rng: () => 0.999,
  });

  expect(report.blocked).toBe(true);
  expect(nextState.activeMiniScenario.cycleIndex).toBe(0);
});

test("the mini-scenario's run persists across calls until it finishes", async () => {
  const state = baseState();
  const scenario = pricingScenario();
  const first = await runMiniScenarioChallenge({ state, scenario, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  const second = await runMiniScenarioChallenge({ state: first.state, scenario, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(second.state.activeMiniScenario).toBeNull(); // finished after its second (and last) cycle
  expect(second.report.baseReport).toBeDefined();
});

test("the career's own missions/objectives are untouched by a mini-scenario run", async () => {
  const state = baseState();
  const { state: nextState } = await runMiniScenarioChallenge({ state, scenario: pricingScenario(), referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  expect(nextState.missions).toBe(state.missions);
  expect(nextState.objectives).toBe(state.objectives);
});
