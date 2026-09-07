import { analyzeCycle, analyzeRun, compareRuns, generateCompetitionReport, generateGroupReport, generateReport } from "./analyticsEngine";
import { initScenarioRun, runScenarioBatch, finalizeScenarioRun } from "../scenario/scenarioEngine";
import { createScenarioTemplate } from "../scenario/scenarioSchema";
import { buildReplayRunFromScenarioRun } from "../replay/replayEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function scenario(overrides = {}) {
  return createScenarioTemplate("solo", {
    objectives: [{ id: "profit", label: "Profit positif", kpi: "profit", comparator: "gte", target: 0, required: true }],
    duration: { unit: "days", value: 3 },
    ...overrides,
  });
}

async function playedReplayRun(runId, rng = () => 0.999) {
  const run = initScenarioRun({ scenario: scenario() });
  const { runState } = await runScenarioBatch({ runState: run, cycles: 3, referenceDate: REFERENCE_DATE, rng });
  const finalReport = finalizeScenarioRun(runState);
  return buildReplayRunFromScenarioRun({ runId, runState, finalReport, ownerLabel: runId });
}

test("analyzeRun produces KPIs, decisions, events and diagnostics from a real scenario run", async () => {
  const replayRun = await playedReplayRun("run-1");
  const analysis = analyzeRun(replayRun);

  expect(analysis.runId).toBe("run-1");
  expect(analysis.kpis.profit).toEqual(expect.objectContaining({ count: 3 }));
  expect(Array.isArray(analysis.diagnostics)).toBe(true);
  expect(Array.isArray(analysis.recommendations)).toBe(true);
});

test("analyzeCycle scopes KPIs/events/decisions and diagnostics to one cycle", async () => {
  const replayRun = await playedReplayRun("run-1");
  const cycleAnalysis = analyzeCycle(replayRun, 1);

  expect(cycleAnalysis.cycleIndex).toBe(1);
  expect(cycleAnalysis.kpis).toEqual(expect.objectContaining({ cycleIndex: 1 }));
  expect(cycleAnalysis.diagnostics.every((d) => d.cycleIndex === 1)).toBe(true);
});

test("analyzeCycle returns null for a cycle that was never played", async () => {
  const replayRun = await playedReplayRun("run-1");
  expect(analyzeCycle(replayRun, 99)).toBeNull();
});

test("compareRuns builds a full strategy comparison between two real analyses", async () => {
  const replayA = await playedReplayRun("run-a", () => 0.999);
  const replayB = await playedReplayRun("run-b", () => 0.1);
  const comparison = compareRuns(analyzeRun(replayA), analyzeRun(replayB));

  expect(comparison.runA.id).toBe("run-a");
  expect(comparison.runB.id).toBe("run-b");
  expect(comparison.scoring).toBeDefined();
});

test("generateReport packages one analysis into the final report shape", async () => {
  const replayRun = await playedReplayRun("run-1");
  const report = generateReport(analyzeRun(replayRun));
  expect(report).toEqual(expect.objectContaining({ runId: "run-1", finalScore: expect.any(Number) }));
});

test("generateGroupReport ranks multiple analyses for a teacher-facing view", async () => {
  const replayA = await playedReplayRun("run-a");
  const replayB = await playedReplayRun("run-b");
  const report = generateGroupReport([analyzeRun(replayA), analyzeRun(replayB)]);
  expect(report.groupCount).toBe(2);
  expect(report.ranking).toHaveLength(2);
});

test("generateCompetitionReport reuses the group shape for an organizer-facing view", async () => {
  const replayA = await playedReplayRun("run-a");
  const report = generateCompetitionReport([analyzeRun(replayA)]);
  expect(report.playerCount).toBe(1);
});
