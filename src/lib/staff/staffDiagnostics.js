// HR diagnostics -- same anomaly/error/opportunity vocabulary
// lib/finance/financeDiagnostics.js and lib/analytics/analyticsDiagnostics
// .js already use, applied to one HR cycle's own numbers. See
// staffEngine.js's staffDiagnosticsToAnalytics() for how these fold into
// the Analytics module's own diagnostics list.
import { safeNumber, safeObject } from "../safe";

const DIAGNOSTIC_TYPES = ["anomaly", "error", "opportunity"];

function diagnostic(type, severity, message) {
  return { type: DIAGNOSTIC_TYPES.includes(type) ? type : "anomaly", severity, message };
}

export function generateStaffDiagnostics({ headcount, morale, productivity, absenteeism, overload, housekeepingLoad, serviceLoad, turnover } = {}) {
  const diagnostics = [];
  const counts = safeObject(headcount);
  const turnoverInfo = safeObject(turnover);

  const overloadValue = safeNumber(overload, 0);
  if (overloadValue > 130) {
    diagnostics.push(diagnostic("error", "high", `Surcharge critique (${overloadValue}% de la capacité nominale) : risque d'épuisement et de baisse de qualité de service.`));
  } else if (overloadValue > 100) {
    diagnostics.push(diagnostic("anomaly", "medium", `Surcharge (${overloadValue}% de la capacité nominale) : l'équipe travaille au-delà de sa capacité confortable.`));
  }

  if (safeNumber(housekeepingLoad, 0) > 120) {
    diagnostics.push(diagnostic("anomaly", "medium", `Sous-effectif en housekeeping (${housekeepingLoad}% de charge) : le nombre de chambres dépasse la capacité de l'équipe d'étage.`));
  }

  if (safeNumber(serviceLoad, 0) > 120) {
    diagnostics.push(diagnostic("anomaly", "medium", `Sous-effectif en salle (${serviceLoad}% de charge) : le restaurant manque de personnel de service.`));
  }

  const moraleValue = safeNumber(morale, 0);
  if (moraleValue < 40) {
    diagnostics.push(diagnostic("error", "high", `Moral critique (${moraleValue}/100) : risque élevé de démissions et de baisse de productivité.`));
  } else if (moraleValue < 55) {
    diagnostics.push(diagnostic("anomaly", "medium", `Moral faible (${moraleValue}/100) : surveiller l'ambiance et les conditions de travail.`));
  }

  const absenteeismValue = safeNumber(absenteeism, 0);
  if (absenteeismValue > 25) {
    diagnostics.push(diagnostic("error", "high", `Absentéisme élevé (${absenteeismValue}%) : impact direct sur le service et la charge des présents.`));
  } else if (absenteeismValue > 15) {
    diagnostics.push(diagnostic("anomaly", "medium", `Absentéisme en hausse (${absenteeismValue}%).`));
  }

  if (turnoverInfo.estimatedRate > 25) {
    diagnostics.push(diagnostic("error", "high", `Turnover élevé (estimation ${turnoverInfo.estimatedRate}%/mois) : coûts de recrutement et perte de savoir-faire.`));
  } else if (turnoverInfo.estimatedRate > 15) {
    diagnostics.push(diagnostic("anomaly", "medium", `Turnover en hausse (estimation ${turnoverInfo.estimatedRate}%/mois).`));
  }

  if (turnoverInfo.departuresLast > 0) {
    diagnostics.push(diagnostic("anomaly", "medium", `${turnoverInfo.departuresLast} départ(s) lors du dernier cycle.`));
  }

  const productivityValue = safeNumber(productivity, 0);
  if (productivityValue < 50) {
    diagnostics.push(diagnostic("anomaly", "medium", `Productivité faible (${productivityValue}/100).`));
  }

  if (moraleValue >= 75 && overloadValue < 90 && absenteeismValue <= 8) {
    diagnostics.push(diagnostic("opportunity", "low", `Équipe en bonne santé (moral ${moraleValue}/100, charge maîtrisée) : bon moment pour former ou promouvoir.`));
  }

  if (counts.total > 0 && overloadValue < 70) {
    diagnostics.push(diagnostic("opportunity", "low", `Capacité disponible (charge ${overloadValue}%) : marge pour absorber une hausse d'activité sans recruter.`));
  }

  return diagnostics;
}
