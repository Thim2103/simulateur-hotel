import { buildCompetitionReport, buildFinalReport, buildGroupComparisonReport } from "./analyticsReports";

function analysis(runId, ownerLabel, finalScore, diagnostics = []) {
  return {
    runId,
    ownerLabel,
    source: "academie",
    replayRun: { scoreHistory: finalScore === null ? [] : [finalScore] },
    kpis: { profit: { average: 1000 } },
    diagnostics,
    recommendations: [],
  };
}

test("buildFinalReport packages score, KPIs, diagnostics and top recommendations", () => {
  const report = buildFinalReport(analysis("g1", "Groupe A", 70, [{ type: "error", severity: "high", message: "x" }]));
  expect(report).toEqual(
    expect.objectContaining({
      runId: "g1",
      ownerLabel: "Groupe A",
      finalScore: 70,
      kpiSummary: { profit: { average: 1000 } },
      topRecommendations: expect.any(Array),
      generatedAt: expect.any(String),
    })
  );
  expect(report.topRecommendations).toHaveLength(1);
});

test("buildFinalReport handles a run with no score yet", () => {
  const report = buildFinalReport(analysis("g1", "Groupe A", null));
  expect(report.finalScore).toBeNull();
});

test("buildGroupComparisonReport ranks groups by final score and counts errors", () => {
  const analyses = [
    analysis("g1", "Groupe A", 60, [{ type: "error" }]),
    analysis("g2", "Groupe B", 90, []),
  ];
  const report = buildGroupComparisonReport(analyses);
  expect(report.groupCount).toBe(2);
  expect(report.ranking[0]).toEqual(expect.objectContaining({ rank: 1, runId: "g2", finalScore: 90 }));
  expect(report.ranking[1]).toEqual(expect.objectContaining({ rank: 2, runId: "g1", errorCount: 1 }));
});

test("buildCompetitionReport reuses the group report shape with a playerCount alias", () => {
  const analyses = [analysis("p1", "Ada", 70)];
  const report = buildCompetitionReport(analyses);
  expect(report.playerCount).toBe(1);
  expect(report.ranking).toHaveLength(1);
});
