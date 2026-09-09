// Multi-department objectives -- "objectifs multi-départements". Reuses
// lib/scenario/scenarioObjectives.js's readKpi()/evaluateObjectives(),
// the same generic dotted-path evaluator lib/tfe/tfeStoryline.js already
// relies on, against the "month snapshot" proEngine.js builds each month
// (occupancyRate/ebitdaMargin/staff/marketing/esg/housekeeping/
// restaurantAdvanced/rmAdvanced/clients/score).
//
// Every KPI here is a 0-100 score, a ratio, or a percentage -- never an
// absolute currency amount: a Pro hotel's size is the player's own
// choice, so an absolute EBITDA target would be trivial for a large
// hotel and unreachable for a small one -- ratios stay fair regardless
// of size (same reasoning as tfeStoryline.js's own objectives).
import { safeArray } from "../safe";
import { evaluateObjectives } from "../scenario/scenarioObjectives";

export const PRO_OBJECTIVE_CATALOG = [
  { id: "always-profitable", label: "Rester rentable (marge EBITDA positive)", kpi: "ebitdaMargin", comparator: "gte", target: 0, weight: 1.5 },
  { id: "occupancy-70", label: "Maintenir un taux d'occupation de 70%", kpi: "occupancyRate", comparator: "gte", target: 70, weight: 1 },
  { id: "rm-direct-40", label: "Maintenir une part directe RM de 40%", kpi: "rmAdvanced.directShare", comparator: "gte", target: 40, weight: 1 },
  { id: "fb-margin-55", label: "Maintenir une marge brute F&B de 55%", kpi: "restaurantAdvanced.grossMargin", comparator: "gte", target: 55, weight: 1 },
  { id: "staff-wellbeing", label: "Maintenir un moral d'équipe de 55", kpi: "staff.morale", comparator: "gte", target: 55, weight: 1 },
  { id: "marketing-reputation-65", label: "Maintenir une réputation marketing de 65", kpi: "marketing.reputation", comparator: "gte", target: 65, weight: 0.75 },
  { id: "esg-conscious", label: "Maintenir un score ESG de 60", kpi: "esg.score", comparator: "gte", target: 60, weight: 1 },
  { id: "housekeeping-quality-70", label: "Maintenir une qualité housekeeping de 70", kpi: "housekeeping.quality", comparator: "gte", target: 70, weight: 0.75 },
  { id: "clients-satisfaction-70", label: "Maintenir une satisfaction clients de 70", kpi: "clients.satisfaction", comparator: "gte", target: 70, weight: 1 },
  { id: "final-performance", label: "Atteindre un score professionnel de 75/100", kpi: "score.total", comparator: "gte", target: 75, weight: 1.5 },
];

export function seedProObjectives() {
  return PRO_OBJECTIVE_CATALOG.map((objective) => ({ ...objective, achieved: false }));
}

export function evaluateProObjectives(objectives, monthSnapshot) {
  const { objectives: results } = evaluateObjectives(monthSnapshot, objectives);
  return results.map((result) => ({ ...result, achieved: result.achieved }));
}

export function objectivesProgress(objectives) {
  const list = safeArray(objectives);
  if (!list.length) return 0;
  const achieved = list.filter((objective) => objective.achieved).length;
  return Math.round((achieved / list.length) * 100);
}
