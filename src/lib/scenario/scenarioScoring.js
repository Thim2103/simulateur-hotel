// Computes a scenario's weighted score for one cycle (or a whole run, when
// called against the final state), from the report's own KPIs plus the
// objectives already evaluated by scenarioObjectives.js.
import { safeArray, safeNumber, safeObject } from "../safe";
import { readKpi } from "./scenarioObjectives";

const KPI_PATH_BY_CATEGORY = {
  finance: "finance.totalProfit",
  rm: "rm.recommendedADR",
  reputation: "progression.reputation",
  esg: "progressionReport.reputation",
};

// Normalizes an arbitrary KPI's raw value into a 0-100 contribution: a
// negative/zero reading contributes nothing, and anything already framed
// as a percentage (0-100) or a plain positive number is capped at 100.
function normalizeToScore(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function computeScore(state, scoring, objectivesResult) {
  const s = safeObject(scoring);
  const weights = safeObject(s.weights);
  const maxScore = safeNumber(s.maxScore, 100);

  let weighted = 0;
  let totalWeight = 0;

  Object.entries(weights).forEach(([category, weight]) => {
    totalWeight += safeNumber(weight, 0);
    if (category === "objectives") {
      const objectives = safeArray(objectivesResult?.objectives);
      const achievedRatio = objectives.length ? objectives.filter((o) => o.achieved).length / objectives.length : 1;
      weighted += achievedRatio * 100 * safeNumber(weight, 0);
      return;
    }
    const kpiPath = KPI_PATH_BY_CATEGORY[category];
    const value = kpiPath ? readKpi(state, kpiPath) : null;
    weighted += normalizeToScore(value) * safeNumber(weight, 0);
  });

  let score = totalWeight > 0 ? weighted / totalWeight : 0;

  const penaltyBreakdown = [];
  safeArray(s.penalties).forEach((penalty) => {
    if (evaluatePenaltyCondition(penalty.condition, state)) {
      score -= safeNumber(penalty.points, 0);
      penaltyBreakdown.push(penalty);
    }
  });

  score = Math.max(0, Math.min(maxScore, score));

  return { score: Math.round(score), maxScore, appliedPenalties: penaltyBreakdown };
}

function evaluatePenaltyCondition(condition, state) {
  if (typeof condition !== "function") return false;
  try {
    return Boolean(condition(state));
  } catch {
    return false;
  }
}
