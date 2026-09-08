import { buildInsights, topRecommendations } from "./dashboardInsights";

test("buildInsights returns a hasInsights:false shell when there is no analysis yet", () => {
  expect(buildInsights(null)).toEqual({ hasInsights: false, diagnostics: [], recommendations: [], kpis: null });
});

test("buildInsights adapts an Analytics Analysis object", () => {
  const analysis = { diagnostics: [{ type: "error" }], recommendations: [{ text: "a", severity: "high" }], kpis: { profit: { average: 10 } } };
  expect(buildInsights(analysis)).toEqual({ hasInsights: true, diagnostics: analysis.diagnostics, recommendations: analysis.recommendations, kpis: analysis.kpis });
});

test("topRecommendations sorts by severity (high first) and limits the result", () => {
  const insights = {
    recommendations: [
      { text: "low", severity: "low" },
      { text: "high", severity: "high" },
      { text: "medium", severity: "medium" },
      { text: "high2", severity: "high" },
    ],
  };
  const top = topRecommendations(insights, 3);
  expect(top.map((r) => r.text)).toEqual(["high", "high2", "medium"]);
});

test("topRecommendations returns an empty array when there are no recommendations", () => {
  expect(topRecommendations(null)).toEqual([]);
});
