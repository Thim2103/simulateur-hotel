// Professional missions -- "missions professionnelles", organized into 4
// six-month phases across the 24-month horizon. Reuses
// lib/scenario/scenarioObjectives.js's readKpi() against the same month
// snapshot proObjectives.js reads -- same reuse pattern
// lib/tfe/tfeStoryline.js already established.
import { safeArray, safeNumber } from "../safe";
import { readKpi } from "../scenario/scenarioObjectives";

export const PRO_PHASE_CATALOG = [
  { id: "phase-1", title: "Phase 1 : Lancement professionnel", startMonth: 1, endMonth: 6 },
  { id: "phase-2", title: "Phase 2 : Consolidation", startMonth: 7, endMonth: 12 },
  { id: "phase-3", title: "Phase 3 : Optimisation", startMonth: 13, endMonth: 18 },
  { id: "phase-4", title: "Phase 4 : Excellence opérationnelle", startMonth: 19, endMonth: 24 },
];

export const PRO_MISSION_CATALOG = [
  { id: "stable-launch", phaseId: "phase-1", title: "Lancement stable", description: "Atteindre l'équilibre financier (marge EBITDA positive).", kpi: "ebitdaMargin", comparator: "gte", target: 0 },
  { id: "crisis-response", phaseId: "phase-1", title: "Gestion de crise", description: "Traverser la première crise sans perte de moral d'équipe critique (> 40).", kpi: "staff.morale", comparator: "gte", target: 40 },
  { id: "rm-mix", phaseId: "phase-2", title: "Mix RM optimisé", description: "Atteindre 45% de réservations directes.", kpi: "rmAdvanced.directShare", comparator: "gte", target: 45 },
  { id: "fb-profitability", phaseId: "phase-2", title: "Rentabilité F&B", description: "Atteindre 58% de marge brute F&B.", kpi: "restaurantAdvanced.grossMargin", comparator: "gte", target: 58 },
  { id: "sustainable-growth", phaseId: "phase-3", title: "Croissance durable", description: "Atteindre 65 de score ESG.", kpi: "esg.score", comparator: "gte", target: 65 },
  { id: "market-leader", phaseId: "phase-3", title: "Réputation établie", description: "Atteindre 75 de réputation marketing.", kpi: "marketing.reputation", comparator: "gte", target: 75 },
  { id: "guest-excellence", phaseId: "phase-4", title: "Excellence client", description: "Atteindre 80 de satisfaction clients.", kpi: "clients.satisfaction", comparator: "gte", target: 80 },
  { id: "final-performance", phaseId: "phase-4", title: "Performance finale", description: "Atteindre un score professionnel de 80/100.", kpi: "score.total", comparator: "gte", target: 80 },
];

export function seedPhases() {
  return PRO_PHASE_CATALOG.map((phase) => ({ ...phase }));
}

export function seedProMissions() {
  return PRO_MISSION_CATALOG.map((mission) => ({ ...mission, status: "accepted", achieved: false, completedOnMonth: null }));
}

// Every Pro mission is auto-accepted from month 1 (no "accept" step --
// a Pro run's phases are fixed in advance, not chosen by the player) and
// stays completed once reached -- same contract as
// lib/tfe/tfeStoryline.js's evaluateTfeMissions().
export function evaluateProMissions(missions, monthSnapshot, month) {
  return safeArray(missions).map((mission) => {
    if (mission.achieved) return mission;
    const value = readKpi(monthSnapshot, mission.kpi);
    const achieved = value !== null && value >= safeNumber(mission.target, 0);
    return achieved ? { ...mission, status: "completed", achieved: true, completedOnMonth: month } : mission;
  });
}

export function missionsJustCompleted(previousMissions, nextMissions) {
  const previouslyAchieved = new Set(safeArray(previousMissions).filter((mission) => mission.achieved).map((mission) => mission.id));
  return safeArray(nextMissions).filter((mission) => mission.achieved && !previouslyAchieved.has(mission.id));
}

export function findCurrentPhase(month, phases = PRO_PHASE_CATALOG) {
  const list = safeArray(phases).length ? phases : PRO_PHASE_CATALOG;
  return list.find((phase) => month >= phase.startMonth && month <= phase.endMonth) || list[list.length - 1] || null;
}

export function computePhaseProgress(month, horizonMonths = 24, phases = PRO_PHASE_CATALOG) {
  const currentPhase = findCurrentPhase(Math.max(1, month), phases);
  const overallProgress = Math.round(Math.min(100, (month / Math.max(1, horizonMonths)) * 100));
  const phaseProgress = currentPhase
    ? Math.round(Math.min(100, ((month - currentPhase.startMonth + 1) / (currentPhase.endMonth - currentPhase.startMonth + 1)) * 100))
    : 0;
  return { currentPhase, overallProgress, phaseProgress: Math.max(0, phaseProgress) };
}
