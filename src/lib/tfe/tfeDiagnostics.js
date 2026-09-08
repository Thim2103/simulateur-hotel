// TFE diagnostics -- same anomaly/error/opportunity vocabulary every
// business module already uses (see lib/finance/financeDiagnostics.js/
// lib/staff/staffDiagnostics.js/lib/marketing/marketingDiagnostics.js/
// lib/esg/esgDiagnostics.js/lib/housekeeping/housekeepingDiagnostics.js).
// This module doesn't re-derive anything those already computed --
// tfeEngine.js collects every module's own diagnostics for the month and
// passes them in here, and this file only adds TFE-scoped, cross-module
// diagnostics (chapter pacing, bankruptcy risk, overall trajectory) that
// no single business module could produce on its own.
import { safeArray, safeNumber } from "../safe";

const DIAGNOSTIC_TYPES = ["anomaly", "error", "opportunity"];

function diagnostic(type, severity, message) {
  return { type: DIAGNOSTIC_TYPES.includes(type) ? type : "anomaly", severity, message };
}

export function generateTfeDiagnostics({ moduleDiagnostics = [], score, cash, month, horizonMonths = 36, chapterProgress, missionsCompletedCount, missionsTotalCount } = {}) {
  const diagnostics = [...safeArray(moduleDiagnostics)];

  const scoreValue = safeNumber(score, 0);
  if (scoreValue < 40) {
    diagnostics.push(diagnostic("error", "high", `Performance globale critique (${scoreValue}/100) : le projet TFE risque de se solder par un échec commercial.`));
  } else if (scoreValue >= 85) {
    diagnostics.push(diagnostic("opportunity", "low", `Performance globale excellente (${scoreValue}/100) : trajectoire vers un score final A.`));
  }

  const cashValue = safeNumber(cash, null);
  const monthsRemaining = Math.max(0, safeNumber(horizonMonths, 36) - safeNumber(month, 0));
  if (cashValue !== null && cashValue <= 0 && monthsRemaining > 0) {
    diagnostics.push(diagnostic("error", "high", `Trésorerie épuisée à ${monthsRemaining} mois de la fin du TFE : risque de faillite avant le terme des 36 mois.`));
  }

  const monthValue = safeNumber(month, 0);
  const halfway = Math.round(safeNumber(horizonMonths, 36) / 2);
  if (monthValue === halfway && missionsTotalCount > 0 && missionsCompletedCount === 0) {
    diagnostics.push(diagnostic("anomaly", "medium", "Aucune mission de storyline complétée à mi-parcours : le rythme du projet prend du retard."));
  }

  if (chapterProgress?.currentChapter && chapterProgress.chapterProgress >= 90 && missionsCompletedCount < missionsTotalCount) {
    diagnostics.push(diagnostic("anomaly", "medium", `Le chapitre "${chapterProgress.currentChapter.title}" touche à sa fin avec des missions encore incomplètes.`));
  }

  return diagnostics;
}
