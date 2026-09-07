// Turns diagnostics (see analyticsDiagnostics.js) into short, actionable
// recommendations -- the text a player/teacher actually reads, ranked so
// the highest-severity issues come first.
import { safeArray } from "../safe";

const SEVERITY_WEIGHT = { high: 3, medium: 2, low: 1 };

const TEMPLATES = {
  error: (diagnostic) => `Corriger en priorité : ${diagnostic.message}`,
  anomaly: (diagnostic) => `Vérifier ce qui s'est passé : ${diagnostic.message}`,
  opportunity: (diagnostic) => `À essayer : ${diagnostic.message}`,
};

export function generateRecommendations(diagnostics) {
  const ranked = [...safeArray(diagnostics)].sort((a, b) => (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0));
  return ranked.map((diagnostic) => ({
    type: diagnostic.type,
    severity: diagnostic.severity,
    cycleIndex: diagnostic.cycleIndex,
    text: (TEMPLATES[diagnostic.type] || TEMPLATES.anomaly)(diagnostic),
  }));
}

// A short top-N slice for a compact UI (a dashboard card, not the full
// diagnostics table).
export function topRecommendations(diagnostics, count = 3) {
  return generateRecommendations(diagnostics).slice(0, count);
}
