// Housekeeping diagnostics -- same anomaly/error/opportunity vocabulary
// lib/finance/financeDiagnostics.js/lib/staff/staffDiagnostics.js/
// lib/marketing/marketingDiagnostics.js/lib/esg/esgDiagnostics.js already
// use, applied to one HK cycle's own numbers. See
// housekeepingEngine.js's housekeepingDiagnosticsToAnalytics() for how
// these fold into the Analytics module's own diagnostics list.
import { safeNumber, safeObject } from "../safe";

const DIAGNOSTIC_TYPES = ["anomaly", "error", "opportunity"];

function diagnostic(type, severity, message) {
  return { type: DIAGNOSTIC_TYPES.includes(type) ? type : "anomaly", severity, message };
}

export function generateHousekeepingDiagnostics({ workload, overload, understaffing, quality, productivity, priorities, esgEnergyScore, esgWaterScore } = {}) {
  const diagnostics = [];
  const load = safeObject(workload);
  const staffing = safeObject(understaffing);
  const priority = safeObject(priorities);

  const overloadValue = safeNumber(overload, 0);
  if (overloadValue > 130) {
    diagnostics.push(diagnostic("error", "high", `Surcharge critique en housekeeping (${overloadValue}% de la capacité) : risque de retard sur les arrivées.`));
  } else if (overloadValue > 100) {
    diagnostics.push(diagnostic("anomaly", "medium", `Surcharge housekeeping (${overloadValue}% de la capacité).`));
  }

  if (staffing.understaffed) {
    diagnostics.push(diagnostic("error", "high", `Sous-effectif housekeeping : ${staffing.shortfall} chambre(s) au-delà de la capacité effective de l'équipe.`));
  }

  const qualityValue = safeNumber(quality, 0);
  if (qualityValue < 45) {
    diagnostics.push(diagnostic("error", "high", `Qualité de nettoyage insuffisante (${qualityValue}/100) : risque direct sur la satisfaction client.`));
  } else if (qualityValue < 65) {
    diagnostics.push(diagnostic("anomaly", "medium", `Qualité de nettoyage moyenne (${qualityValue}/100).`));
  }

  const productivityValue = safeNumber(productivity, 0);
  if (productivityValue < 45) {
    diagnostics.push(diagnostic("anomaly", "medium", `Productivité housekeeping faible (${productivityValue}/100).`));
  }

  if (priority.arrivals > 0 && overloadValue > 100) {
    diagnostics.push(diagnostic("error", "high", `${priority.arrivals} arrivée(s) attendue(s) aujourd'hui avec une équipe déjà en surcharge : risque de chambres non prêtes à temps.`));
  }

  // "synchroniser avec ESG (eau, énergie)" (section 5): an inefficient
  // (high-consumption-score) property tends to run older equipment,
  // compounding an already-heavy housekeeping load.
  if (safeNumber(esgEnergyScore, 0) > 75 && overloadValue > 100) {
    diagnostics.push(diagnostic("anomaly", "medium", `Équipements énergivores (score ESG énergie ${esgEnergyScore}/100) qui ralentissent le nettoyage déjà en surcharge.`));
  }
  if (safeNumber(esgWaterScore, 0) > 75 && overloadValue > 100) {
    diagnostics.push(diagnostic("anomaly", "medium", `Consommation d'eau élevée (score ESG eau ${esgWaterScore}/100) : les équipements de nettoyage gagneraient à être modernisés.`));
  }

  if (load.roomsToClean === 0) {
    diagnostics.push(diagnostic("opportunity", "low", "Aucune chambre à nettoyer aujourd'hui : bon moment pour de la formation ou de la maintenance préventive."));
  } else if (qualityValue >= 80 && overloadValue < 80) {
    diagnostics.push(diagnostic("opportunity", "low", `Équipe housekeeping performante (qualité ${qualityValue}/100, charge maîtrisée) : capacité disponible pour absorber une hausse d'occupation.`));
  }

  return diagnostics;
}
