// Packages a single Analysis (see analyticsEngine.js's analyzeRun()) into
// the final report a player/teacher/organizer reads, and aggregates
// several analyses into a class-wide (Academy) or match-wide
// (Competition) report.
import { safeArray } from "../safe";
import { topRecommendations } from "./analyticsRecommendations";

export function buildFinalReport(analysis) {
  return {
    runId: analysis?.runId,
    ownerLabel: analysis?.ownerLabel,
    source: analysis?.source,
    finalScore: safeArray(analysis?.replayRun?.scoreHistory).slice(-1)[0] ?? null,
    kpiSummary: analysis?.kpis || {},
    diagnostics: analysis?.diagnostics || [],
    recommendations: analysis?.recommendations || [],
    topRecommendations: topRecommendations(analysis?.diagnostics),
    generatedAt: new Date().toISOString(),
  };
}

// One analysis per group -> a teacher-facing summary: who has the most
// unresolved errors, who's ahead, ranked by final score.
export function buildGroupComparisonReport(analyses) {
  const reports = safeArray(analyses).map(buildFinalReport);
  const ranked = [...reports].sort((a, b) => (b.finalScore ?? -Infinity) - (a.finalScore ?? -Infinity));
  return {
    groupCount: reports.length,
    ranking: ranked.map((report, index) => ({ rank: index + 1, runId: report.runId, ownerLabel: report.ownerLabel, finalScore: report.finalScore, errorCount: report.diagnostics.filter((d) => d.type === "error").length })),
    reports,
    generatedAt: new Date().toISOString(),
  };
}

// Same shape, organizer-facing wording -- kept as a separate export so a
// call site never has to guess which mode's report it's building.
export function buildCompetitionReport(analyses) {
  const base = buildGroupComparisonReport(analyses);
  return { ...base, playerCount: base.groupCount };
}
