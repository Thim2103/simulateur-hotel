// Evaluates a scenario's Objectives against a DailyReport/ChainReport-shaped
// state, by walking a dotted KPI path (e.g. "finance.totalProfit").
import { safeArray, safeNumber } from "../safe";

const COMPARATORS = {
  gte: (value, target) => value >= target,
  lte: (value, target) => value <= target,
  eq: (value, target) => value === target,
};

// Never throws on a missing/malformed path -- returns null so the caller
// can render "—" rather than crash on an objective referencing a KPI the
// current report doesn't have (e.g. before the restaurant module ran).
export function readKpi(state, kpiPath) {
  const segments = String(kpiPath || "").split(".").filter(Boolean);
  let current = state;
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== "object") return null;
    current = current[segment];
  }
  return typeof current === "number" && Number.isFinite(current) ? current : current === null || current === undefined ? null : safeNumber(current, null);
}

export function evaluateObjectives(state, objectives) {
  const list = safeArray(objectives);
  const results = list.map((objective) => {
    const current = readKpi(state, objective.kpi);
    const comparator = COMPARATORS[objective.comparator] || COMPARATORS.gte;
    const achieved = current !== null && comparator(current, safeNumber(objective.target, 0));
    return {
      id: objective.id,
      label: objective.label,
      kpi: objective.kpi,
      target: objective.target,
      current,
      achieved,
      required: Boolean(objective.required),
      weight: safeNumber(objective.weight, 1),
    };
  });

  return {
    objectives: results,
    allAchieved: results.every((entry) => entry.achieved),
    allRequiredAchieved: results.filter((entry) => entry.required).every((entry) => entry.achieved),
  };
}
