// Always-on career objectives (distinct from missions: never "accepted",
// just tracked every day) -- reuses lib/scenario/scenarioObjectives.js's
// KPI-path/comparator format so a career objective, a scenario objective
// and an Academy objective all read the same way.
import { safeArray } from "../safe";
import { evaluateObjectives } from "../scenario/scenarioObjectives";

export const DEFAULT_CAREER_OBJECTIVES = [
  { id: "first-profit", label: "Réaliser un premier jour rentable", kpi: "profit", comparator: "gte", target: 1, weight: 1 },
  { id: "reputation-60", label: "Atteindre 60 de réputation", kpi: "progressionReport.reputation", comparator: "gte", target: 60, weight: 1 },
  { id: "level-3", label: "Atteindre le niveau 3", kpi: "progressionReport.level.level", comparator: "gte", target: 3, weight: 1 },
];

export function seedObjectives(definitions = DEFAULT_CAREER_OBJECTIVES) {
  return safeArray(definitions).map((definition) => ({ ...definition, achieved: false }));
}

// dailyReport: the DailyReport from runDailyCycle() (see
// lib/dailyCycle/runDailyCycle.js) -- objectives read straight out of it,
// the same way a scenario's own objectives read a ScenarioCycleReport.
export function evaluateCareerObjectives(objectives, dailyReport) {
  const { objectives: results } = evaluateObjectives(dailyReport, objectives);
  return results.map((result) => ({ ...result, achieved: result.achieved }));
}

export function newlyAchieved(previousObjectives, nextObjectives) {
  const previouslyAchieved = new Set(safeArray(previousObjectives).filter((o) => o.achieved).map((o) => o.id));
  return safeArray(nextObjectives).filter((objective) => objective.achieved && !previouslyAchieved.has(objective.id));
}
