// Integration test: replayEngine correctly rebuilds a navigable,
// exportable replay directly from a real lib/scenario/scenarioEngine.js
// run, with no adapter in between (the "scenario"/"tfe" source path).
import { finalizeScenarioRun, initScenarioRun, runScenarioBatch } from "../scenario/scenarioEngine";
import { createScenarioTemplate } from "../scenario/scenarioSchema";
import { buildReplayRunFromScenarioRun, getCycleForRun, reconstructStateAtCycle } from "./replayEngine";
import { buildTimeline } from "./replayTimeline";
import { kpiSeries } from "./replayKpis";
import { buildExportPayload } from "./replayExport";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function scenario(mode = "solo") {
  return createScenarioTemplate(mode, {
    objectives: [{ id: "profit", label: "Profit positif", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: 4 },
  });
}

test("a finished solo scenario run becomes a fully navigable replay", async () => {
  const run = initScenarioRun({ scenario: scenario("solo") });
  const { runState } = await runScenarioBatch({ runState: run, cycles: 4, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  const finalReport = finalizeScenarioRun(runState);

  const replayRun = buildReplayRunFromScenarioRun({ runId: "solo-run-1", runState, finalReport });

  expect(replayRun.source).toBe("scenario");
  expect(replayRun.cycles).toHaveLength(4);
  expect(buildTimeline(replayRun.cycles)).toHaveLength(4);
  expect(getCycleForRun(replayRun, 2).cycleIndex).toBe(2);
  expect(reconstructStateAtCycle(replayRun, 0)).toEqual(expect.objectContaining({ hotelState: expect.any(Object) }));
});

test("kpiSeries tracks profit across the full replay, matching the run's own scoreHistory length", async () => {
  const run = initScenarioRun({ scenario: scenario("solo") });
  const { runState } = await runScenarioBatch({ runState: run, cycles: 4, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  const replayRun = buildReplayRunFromScenarioRun({ runId: "solo-run-1", runState });

  expect(kpiSeries(replayRun.cycles, "profit")).toHaveLength(runState.scoreHistory.length);
});

test("a professionnel-mode run (TFE) is tagged as 'tfe' and exports cleanly", async () => {
  const run = initScenarioRun({ scenario: scenario("professionnel") });
  const { runState } = await runScenarioBatch({ runState: run, cycles: 4, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  const finalReport = finalizeScenarioRun(runState);

  const replayRun = buildReplayRunFromScenarioRun({ runId: "tfe-run-1", runState, finalReport, ownerLabel: "Mémoire de fin d'études" });

  expect(replayRun.source).toBe("tfe");
  const payload = buildExportPayload(replayRun);
  expect(payload.finalReport).toEqual(finalReport);
  expect(payload.cycles).toHaveLength(4);
});
