// Integration test: analyticsEngine drives directly off a real ReplayRun
// (see lib/replay/replayEngine.js) with no adapter in between -- exactly
// how useAnalytics.js's hook wires it after loading a run from
// replayRepository.js.
import { initScenarioRun, runScenarioBatch, finalizeScenarioRun } from "../scenario/scenarioEngine";
import { createScenarioTemplate } from "../scenario/scenarioSchema";
import { buildReplayRunFromScenarioRun } from "../replay/replayEngine";
import { analyzeCycle, analyzeRun, generateReport } from "./analyticsEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function scenario() {
  return createScenarioTemplate("solo", {
    objectives: [{ id: "profit", label: "Profit positif", kpi: "profit", comparator: "gte", target: 0, required: true }],
    duration: { unit: "days", value: 3 },
  });
}

async function playedReplayRun() {
  const run = initScenarioRun({ scenario: scenario() });
  const { runState } = await runScenarioBatch({ runState: run, cycles: 3, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  const finalReport = finalizeScenarioRun(runState);
  return buildReplayRunFromScenarioRun({ runId: "solo-run-1", runState, finalReport });
}

test("analyzeRun consumes a real ReplayRun and produces every analysis facet", async () => {
  const replayRun = await playedReplayRun();
  const analysis = analyzeRun(replayRun);

  expect(analysis.replayRun).toBe(replayRun);
  expect(analysis.kpis.profit.count).toBe(3);
  expect(Array.isArray(analysis.diagnostics)).toBe(true);
});

test("analyzeCycle reads the exact cycle the replay's own timeline navigation would show", async () => {
  const replayRun = await playedReplayRun();
  const cycleAnalysis = analyzeCycle(replayRun, 2);
  expect(cycleAnalysis.kpis.cycleIndex).toBe(2);
});

test("generateReport reflects the replay's real final score, not a placeholder", async () => {
  const replayRun = await playedReplayRun();
  const report = generateReport(analyzeRun(replayRun));
  expect(report.finalScore).toBe(replayRun.scoreHistory[replayRun.scoreHistory.length - 1]);
});
