// Professional diagnostics -- same anomaly/error/opportunity vocabulary
// every business module already uses. This module doesn't re-derive
// anything those already computed -- proEngine.js collects every
// module's own diagnostics for the month and passes them in here, and
// this file only adds Pro-scoped, cross-module diagnostics (phase
// pacing, bankruptcy risk, active crises, audit failures, overall
// trajectory) that no single business module could produce on its own.
import { safeArray, safeNumber } from "../safe";

const DIAGNOSTIC_TYPES = ["anomaly", "error", "opportunity"];

function diagnostic(type, severity, message) {
  return { type: DIAGNOSTIC_TYPES.includes(type) ? type : "anomaly", severity, message };
}

export function generateProDiagnostics({
  moduleDiagnostics = [],
  score,
  cash,
  month,
  horizonMonths = 24,
  phaseProgress,
  missionsCompletedCount,
  missionsTotalCount,
  activeCrisesCount = 0,
  auditFailures = [],
} = {}) {
  const diagnostics = [...safeArray(moduleDiagnostics)];

  const scoreValue = safeNumber(score, 0);
  if (scoreValue < 40) {
    diagnostics.push(diagnostic("error", "high", `Performance globale critique (${scoreValue}/100) : le projet professionnel risque l'échec.`));
  } else if (scoreValue >= 85) {
    diagnostics.push(diagnostic("opportunity", "low", `Performance globale excellente (${scoreValue}/100) : trajectoire vers un score final A.`));
  }

  const cashValue = safeNumber(cash, null);
  const monthsRemaining = Math.max(0, safeNumber(horizonMonths, 24) - safeNumber(month, 0));
  if (cashValue !== null && cashValue <= 0 && monthsRemaining > 0) {
    diagnostics.push(diagnostic("error", "high", `Trésorerie épuisée à ${monthsRemaining} mois de la fin du programme : risque de faillite avant le terme des 24 mois.`));
  }

  const monthValue = safeNumber(month, 0);
  const halfway = Math.round(safeNumber(horizonMonths, 24) / 2);
  if (monthValue === halfway && missionsTotalCount > 0 && missionsCompletedCount === 0) {
    diagnostics.push(diagnostic("anomaly", "medium", "Aucune mission professionnelle complétée à mi-parcours : le rythme du programme prend du retard."));
  }

  if (phaseProgress?.currentPhase && phaseProgress.phaseProgress >= 90 && missionsCompletedCount < missionsTotalCount) {
    diagnostics.push(diagnostic("anomaly", "medium", `La phase "${phaseProgress.currentPhase.title}" touche à sa fin avec des missions encore incomplètes.`));
  }

  if (activeCrisesCount >= 2) {
    diagnostics.push(diagnostic("error", "high", `${activeCrisesCount} crises actives simultanément : la résilience opérationnelle est mise à rude épreuve.`));
  } else if (activeCrisesCount === 1) {
    diagnostics.push(diagnostic("anomaly", "medium", "Une crise est actuellement en cours : surveiller son impact sur le département concerné."));
  }

  safeArray(auditFailures).forEach((audit) => {
    diagnostics.push(diagnostic("anomaly", "medium", `Audit ${audit.department} en échec (${audit.score}/100, note ${audit.grade}) : action corrective recommandée.`));
  });

  return diagnostics;
}
