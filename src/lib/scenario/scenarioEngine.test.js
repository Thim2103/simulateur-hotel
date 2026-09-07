import { finalizeScenarioRun, initScenarioRun, playScenarioCycle, runScenarioBatch } from "./scenarioEngine";
import { createScenarioTemplate } from "./scenarioSchema";
import { defaultHotelState } from "../hotel";
import { createInitialRestaurantState } from "../restaurant/restaurantState";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function scenario(overrides = {}) {
  return createScenarioTemplate("academie", {
    objectives: [{ id: "profit", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: 3 },
    ...overrides,
  });
}

function baseParams() {
  return {
    scenario: scenario(),
    hotelState: defaultHotelState,
    restaurantState: createInitialRestaurantState({ structure: { name: "Le Central", concept: "Bistro", location: "Lyon", capacity: 40 } }),
    rooms: [],
    reservations: [],
  };
}

test("initScenarioRun rejects an invalid scenario", () => {
  expect(() => initScenarioRun({ scenario: {} })).toThrow(/invalide/i);
});

test("initScenarioRun applies starting cash from the scenario's constraints", () => {
  const run = initScenarioRun({ ...baseParams(), scenario: scenario({ constraints: { budget: { startingCash: 20000 } } }) });
  expect(run.hotelState.cash).toBe(20000);
  expect(run.totalCycles).toBe(3);
});

test("playScenarioCycle runs the sandboxed daily cycle and never persists", async () => {
  const run = initScenarioRun(baseParams());
  const { report, runState } = await playScenarioCycle({ runState: run, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(report.baseReport.date).toBe("2026-09-10");
  expect(runState.cycleIndex).toBe(1);
  expect(runState.scoreHistory).toHaveLength(1);
  expect(runState.status).toBe("running");
});

test("playScenarioCycle blocks a decision that violates a hard constraint", async () => {
  const run = initScenarioRun({ ...baseParams(), scenario: scenario({ constraints: { pricing: { maxADR: 100 } } }) });
  const { report, runState } = await playScenarioCycle({ runState: run, decisions: { pricingADR: 500 }, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(report.blocked).toBe(true);
  expect(runState.cycleIndex).toBe(0); // no cycle executed
});

test("the run reaches 'finished' once totalCycles is met", async () => {
  let run = initScenarioRun({ ...baseParams(), scenario: scenario({ duration: { unit: "days", value: 1 } }) });
  ({ runState: run } = await playScenarioCycle({ runState: run, referenceDate: REFERENCE_DATE, rng: () => 0.999 }));
  expect(run.status).toBe("finished");
});

test("runScenarioBatch plays several cycles without interaction and stops at totalCycles", async () => {
  const run = initScenarioRun(baseParams());
  const { runState, reports } = await runScenarioBatch({ runState: run, cycles: 3, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(reports).toHaveLength(3);
  expect(runState.status).toBe("finished");
  expect(runState.scoreHistory).toHaveLength(3);
});

test("finalizeScenarioRun grades the run and packages the replay", async () => {
  const run = initScenarioRun(baseParams());
  const { runState } = await runScenarioBatch({ runState: run, cycles: 3, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  const finalReport = finalizeScenarioRun(runState);
  expect(finalReport).toEqual(
    expect.objectContaining({
      finalScore: expect.any(Number),
      grade: expect.any(String),
      passed: expect.any(Boolean),
      replaySummary: expect.objectContaining({ totalCycles: 3 }),
    })
  );
});
