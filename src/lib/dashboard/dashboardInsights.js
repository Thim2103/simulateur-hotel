// Thin adapter over an Analytics Analysis object (see
// lib/analytics/analyticsEngine.js's analyzeRun(), already computed by
// useCareer.js's nextDay() and stored as careerState.lastAnalysis) --
// the Dashboard's "Insights" section shows diagnostics + recommendations
// straight from Analytics, it doesn't recompute anything.
import { safeArray } from "../safe";

export function buildInsights(analysis) {
  if (!analysis) {
    return { hasInsights: false, diagnostics: [], recommendations: [], kpis: null };
  }
  return {
    hasInsights: true,
    diagnostics: safeArray(analysis.diagnostics),
    recommendations: safeArray(analysis.recommendations),
    kpis: analysis.kpis || null,
  };
}

// Top N recommendations, most severe first -- what the "Insights" card
// actually shows (the full list is available via the Analytics module's
// own pages, still reachable at /analytics).
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export function topRecommendations(insights, limit = 3) {
  return safeArray(insights?.recommendations)
    .slice()
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3))
    .slice(0, limit);
}
