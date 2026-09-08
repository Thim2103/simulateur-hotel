// Certifications -- Green Key, EarthCheck, ISO 14001 (section 1). Each
// has real, escalating requirements against the same metrics this module
// already computes (score, waste reduction, CO₂), so "obtenir une
// certification" is a genuine milestone, not a checkbox (contrast with
// the old ESG.jsx page, where certifications were a free-text checklist
// with no gameplay effect).
import { safeArray, safeNumber } from "../safe";

export const CERTIFICATION_CATALOG = [
  {
    id: "green-key",
    name: "Green Key",
    description: "Label international pour les établissements engagés dans une démarche environnementale de base.",
    requirements: { score: 55, wasteReductionScore: 45, co2Max: 400 },
    impact: { reputationBonus: 3, financeReduction: 0.02 },
  },
  {
    id: "earthcheck",
    name: "EarthCheck",
    description: "Certification avancée basée sur la performance environnementale mesurée (énergie, eau, CO₂).",
    requirements: { score: 65, energyMax: 350, co2Max: 300 },
    impact: { reputationBonus: 5, financeReduction: 0.03 },
  },
  {
    id: "iso-14001",
    name: "ISO 14001",
    description: "Norme de management environnemental -- exige un score ESG élevé et déjà une première certification obtenue.",
    requirements: { score: 75, waterMax: 60, requiresPriorCertification: true },
    impact: { reputationBonus: 8, financeReduction: 0.05 },
  },
];

export function findCertification(certificationId) {
  return CERTIFICATION_CATALOG.find((certification) => certification.id === certificationId) || null;
}

function requirementChecks(certification, { score, energy, water, waste, co2, hotelEsg, obtainedIds }) {
  const requirements = certification.requirements;
  const checks = [];

  if (requirements.score !== undefined) {
    checks.push({ label: `Score ESG ≥ ${requirements.score}`, met: safeNumber(score, 0) >= requirements.score });
  }
  if (requirements.wasteReductionScore !== undefined) {
    checks.push({ label: `Réduction des déchets ≥ ${requirements.wasteReductionScore}`, met: safeNumber(hotelEsg?.wasteReduction, 0) >= requirements.wasteReductionScore });
  }
  if (requirements.energyMax !== undefined) {
    checks.push({ label: `Énergie ≤ ${requirements.energyMax} kWh`, met: safeNumber(energy, Infinity) <= requirements.energyMax });
  }
  if (requirements.waterMax !== undefined) {
    checks.push({ label: `Eau ≤ ${requirements.waterMax} m³`, met: safeNumber(water, Infinity) <= requirements.waterMax });
  }
  if (requirements.co2Max !== undefined) {
    checks.push({ label: `CO₂ ≤ ${requirements.co2Max} kg`, met: safeNumber(co2, Infinity) <= requirements.co2Max });
  }
  if (requirements.requiresPriorCertification) {
    checks.push({ label: "Détenir déjà une autre certification", met: safeArray(obtainedIds).length > 0 });
  }

  return checks;
}

// Progress (0-100) and the individual requirement checks -- "progression
// / actions nécessaires" (see pages/EsgCertifications.jsx).
export function computeCertificationProgress(certification, metrics) {
  const checks = requirementChecks(certification, metrics);
  const metCount = checks.filter((check) => check.met).length;
  const progress = checks.length ? Math.round((metCount / checks.length) * 100) : 0;
  return { checks, progress, eligible: checks.length > 0 && metCount === checks.length };
}

export function computeAllCertificationsProgress(metrics) {
  const obtainedIds = safeArray(metrics.obtainedIds);
  return CERTIFICATION_CATALOG.map((certification) => ({
    ...certification,
    obtained: obtainedIds.includes(certification.id),
    ...computeCertificationProgress(certification, { ...metrics, obtainedIds }),
  }));
}

// The next certification a player could realistically pursue: the first
// not-yet-obtained one in catalog order with the highest progress --
// used by the "obtenir-certification" quick action (see esgActions.js).
export function nextEligibleCertification(metrics) {
  const progress = computeAllCertificationsProgress(metrics).filter((certification) => !certification.obtained);
  if (!progress.length) return null;
  const eligible = progress.find((certification) => certification.eligible);
  if (eligible) return eligible;
  return progress.reduce((best, certification) => (certification.progress > best.progress ? certification : best), progress[0]);
}
