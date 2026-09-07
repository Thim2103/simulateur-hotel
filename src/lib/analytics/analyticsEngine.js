// Orchestrates the Analytics module: takes an already-loaded ReplayRun
// (see lib/replay/replayEngine.js -- Analytics never talks to Supabase or
// re-simulates anything itself) and runs every analysis pass over it,
// producing one Analysis object the rest of the module and the UI share.
import { safeArray } from "../safe";
import { getCycleForRun } from "../replay/replayEngine";
import { kpisForCycle } from "../replay/replayKpis";
import { eventsForCycle } from "../replay/replayEvents";
import { decisionsForCycle } from "../replay/replayTimeline";
import { analyzeKpis } from "./analyticsKpis";
import { analyzeDecisions } from "./analyticsDecisions";
import { analyzeEvents } from "./analyticsEvents";
import { generateDiagnostics } from "./analyticsDiagnostics";
import { generateRecommendations } from "./analyticsRecommendations";
import { compareStrategies } from "./analyticsComparison";
import { buildCompetitionReport, buildFinalReport, buildGroupComparisonReport } from "./analyticsReports";

// The objectives the diagnostics/recommendations passes reason about:
// the last cycle's own snapshot if the run is still going, or the final
// report's (see lib/scenario/scenarioEvaluation.js's evaluateFinal())
// once it's finished and graded.
function objectivesResultFor(replayRun) {
  if (replayRun?.finalReport?.objectivesResults) return { objectives: replayRun.finalReport.objectivesResults };
  const lastCycle = safeArray(replayRun?.cycles).slice(-1)[0];
  return lastCycle?.objectivesStatus || { objectives: [] };
}

// 1-5. Full analysis of one run: KPIs, decisions, events, diagnostics
// (anomalies/errors/opportunities), recommendations.
export function analyzeRun(replayRun) {
  const cycles = safeArray(replayRun?.cycles);
  const kpis = analyzeKpis(cycles);
  const decisions = analyzeDecisions(cycles);
  const events = analyzeEvents(cycles);
  const objectivesResult = objectivesResultFor(replayRun);
  const diagnostics = generateDiagnostics({ cycles, kpiAnalysis: kpis, decisionAnalysis: decisions, objectivesResult });
  const recommendations = generateRecommendations(diagnostics);

  return {
    runId: replayRun?.id,
    ownerLabel: replayRun?.ownerLabel,
    source: replayRun?.source,
    replayRun,
    kpis,
    decisions,
    events,
    diagnostics,
    recommendations,
  };
}

// A narrower, single-cycle view -- the KPIs/events/decisions for that one
// cycle plus whichever diagnostics were anchored to it.
export function analyzeCycle(replayRun, cycleIndex) {
  const cycle = getCycleForRun(replayRun, cycleIndex);
  if (!cycle) return null;
  const fullAnalysis = analyzeRun(replayRun);
  return {
    cycleIndex,
    kpis: kpisForCycle(cycle),
    events: eventsForCycle(cycle),
    decisions: decisionsForCycle(cycle),
    diagnostics: fullAnalysis.diagnostics.filter((diagnostic) => diagnostic.cycleIndex === cycleIndex),
  };
}

export function compareRuns(analysisA, analysisB) {
  return compareStrategies(analysisA, analysisB);
}

export function generateReport(analysis) {
  return buildFinalReport(analysis);
}

// 6-7. Aggregate several groups'/players' own analyses into one
// teacher/organizer-facing report.
export function generateGroupReport(analyses) {
  return buildGroupComparisonReport(analyses);
}

export function generateCompetitionReport(analyses) {
  return buildCompetitionReport(analyses);
}

export const analyticsEngine = { analyzeRun, analyzeCycle, compareRuns, generateReport, generateGroupReport, generateCompetitionReport };
export default analyticsEngine;
