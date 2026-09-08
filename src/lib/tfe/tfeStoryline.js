// Storyline TFE -- "chapitres, missions, objectifs" (section 1/4).
// Reuses lib/scenario/scenarioObjectives.js's readKpi()/evaluateObjectives
// () -- already generic over any dotted-path state object, not just a
// DailyReport -- against the "month snapshot" tfeEngine.js builds each
// month (occupancyRate/ebitdaMargin/staff/marketing/esg/housekeeping/
// score), the same reuse lib/career/careerObjectives.js already relies
// on for the regular Solo/Carrière mode.
//
// Every KPI here is a 0-100 score or a ratio, never an absolute currency
// amount: a TFE hotel's size and starting budget are the player's own
// choice (see tfeScenario.js's "taille"), so an absolute EBITDA target
// would be trivial for a large hotel and unreachable for a small one --
// ratios stay fair regardless of size.
import { safeArray, safeNumber } from "../safe";
import { evaluateObjectives, readKpi } from "../scenario/scenarioObjectives";

export const TFE_CHAPTER_CATALOG = [
  { id: "annee-1", title: "Année 1 : Lancement", startMonth: 1, endMonth: 12 },
  { id: "annee-2", title: "Année 2 : Consolidation", startMonth: 13, endMonth: 24 },
  { id: "annee-3", title: "Année 3 : Expansion", startMonth: 25, endMonth: 36 },
];

export const TFE_MISSION_CATALOG = [
  { id: "stable-launch", chapterId: "annee-1", title: "Lancement stable", description: "Atteindre l'équilibre financier (marge EBITDA positive).", kpi: "ebitdaMargin", comparator: "gte", target: 0, rewardId: null },
  { id: "team-cohesion", chapterId: "annee-1", title: "Cohésion d'équipe", description: "Atteindre 60 de moral d'équipe.", kpi: "staff.morale", comparator: "gte", target: 60, rewardId: null },
  { id: "sustainable-growth", chapterId: "annee-2", title: "Croissance durable", description: "Atteindre 60 de score ESG.", kpi: "esg.score", comparator: "gte", target: 60, rewardId: null },
  { id: "market-leader", chapterId: "annee-2", title: "Réputation établie", description: "Atteindre 70 de réputation marketing.", kpi: "marketing.reputation", comparator: "gte", target: 70, rewardId: null },
  { id: "operational-excellence", chapterId: "annee-3", title: "Excellence opérationnelle", description: "Atteindre 75 de qualité housekeeping.", kpi: "housekeeping.quality", comparator: "gte", target: 75, rewardId: null },
  { id: "final-performance", chapterId: "annee-3", title: "Performance finale", description: "Atteindre un score TFE de 75/100.", kpi: "score.total", comparator: "gte", target: 75, rewardId: null },
];

export const TFE_OBJECTIVE_CATALOG = [
  { id: "always-profitable", label: "Rester rentable (marge EBITDA positive)", kpi: "ebitdaMargin", comparator: "gte", target: 0, weight: 1 },
  { id: "occupancy-70", label: "Maintenir un taux d'occupation de 70%", kpi: "occupancyRate", comparator: "gte", target: 70, weight: 1 },
  { id: "esg-conscious", label: "Maintenir un score ESG de 55", kpi: "esg.score", comparator: "gte", target: 55, weight: 1 },
  { id: "staff-wellbeing", label: "Maintenir un moral d'équipe de 55", kpi: "staff.morale", comparator: "gte", target: 55, weight: 1 },
];

export function seedChapters() {
  return TFE_CHAPTER_CATALOG.map((chapter) => ({ ...chapter }));
}

export function seedTfeMissions() {
  return TFE_MISSION_CATALOG.map((mission) => ({ ...mission, status: "accepted", achieved: false, completedOnMonth: null }));
}

export function seedTfeObjectives() {
  return TFE_OBJECTIVE_CATALOG.map((objective) => ({ ...objective, achieved: false }));
}

// Every TFE mission is auto-accepted from month 1 (no "accept" step --
// unlike the regular Solo/Carrière mode's missions, a TFE run's chapters
// are fixed in advance, not chosen by the player) and stays completed
// once reached.
export function evaluateTfeMissions(missions, monthSnapshot, month) {
  return safeArray(missions).map((mission) => {
    if (mission.achieved) return mission;
    const value = readKpi(monthSnapshot, mission.kpi);
    const achieved = value !== null && value >= safeNumber(mission.target, 0);
    return achieved ? { ...mission, status: "completed", achieved: true, completedOnMonth: month } : mission;
  });
}

export function evaluateTfeObjectives(objectives, monthSnapshot) {
  const { objectives: results } = evaluateObjectives(monthSnapshot, objectives);
  return results.map((result) => ({ ...result, achieved: result.achieved }));
}

export function missionsJustCompleted(previousMissions, nextMissions) {
  const previouslyAchieved = new Set(safeArray(previousMissions).filter((mission) => mission.achieved).map((mission) => mission.id));
  return safeArray(nextMissions).filter((mission) => mission.achieved && !previouslyAchieved.has(mission.id));
}

export function findCurrentChapter(month, chapters = TFE_CHAPTER_CATALOG) {
  const list = safeArray(chapters).length ? chapters : TFE_CHAPTER_CATALOG;
  return list.find((chapter) => month >= chapter.startMonth && month <= chapter.endMonth) || list[list.length - 1] || null;
}

export function computeChapterProgress(month, horizonMonths = 36, chapters = TFE_CHAPTER_CATALOG) {
  const currentChapter = findCurrentChapter(Math.max(1, month), chapters);
  const overallProgress = Math.round(Math.min(100, (month / Math.max(1, horizonMonths)) * 100));
  const chapterProgress = currentChapter
    ? Math.round(Math.min(100, ((month - currentChapter.startMonth + 1) / (currentChapter.endMonth - currentChapter.startMonth + 1)) * 100))
    : 0;
  return { currentChapter, overallProgress, chapterProgress: Math.max(0, chapterProgress) };
}
