// Analyzes the decisions taken across a run's cycles (see
// replayTimeline.decisionsForCycle()): how often each decision field was
// touched, how much it swung cycle to cycle, and whether changing it
// tended to precede a better or worse score next cycle.
import { safeArray, safeNumber } from "../safe";
import { decisionsForCycle } from "../replay/replayTimeline";

function decisionFields(cycles) {
  const fields = new Set();
  safeArray(cycles).forEach((cycle) => Object.keys(decisionsForCycle(cycle)).forEach((key) => fields.add(key)));
  return [...fields];
}

// How often a decision field appears, and how much its numeric values
// swing from one cycle to the next (a proxy for "indecisive" play).
export function analyzeDecisionField(cycles, field) {
  const values = safeArray(cycles).map((cycle) => decisionsForCycle(cycle)[field]).filter((value) => value !== undefined);
  const numeric = values.filter((value) => typeof value === "number");
  const swings = numeric.slice(1).map((value, index) => Math.abs(value - numeric[index]));

  return {
    field,
    timesSet: values.length,
    averageSwing: swings.length ? Math.round((swings.reduce((sum, swing) => sum + swing, 0) / swings.length) * 100) / 100 : 0,
  };
}

export function analyzeDecisions(cycles) {
  const fields = decisionFields(cycles);
  return { fields: fields.map((field) => analyzeDecisionField(cycles, field)), totalCyclesWithDecisions: safeArray(cycles).filter((cycle) => Object.keys(decisionsForCycle(cycle)).length > 0).length };
}

// Pairs each decision field's changes with the score delta on the *next*
// cycle -- a rough signal for "did touching this decision help or hurt".
export function correlateDecisionWithScore(cycles, field) {
  const list = safeArray(cycles);
  const pairs = [];
  for (let i = 0; i < list.length - 1; i += 1) {
    const decision = decisionsForCycle(list[i])[field];
    if (decision === undefined) continue;
    const scoreBefore = safeNumber(list[i].score, null);
    const scoreAfter = safeNumber(list[i + 1].score, null);
    if (scoreBefore === null || scoreAfter === null) continue;
    pairs.push({ cycleIndex: list[i].cycleIndex, decision, scoreDelta: scoreAfter - scoreBefore });
  }
  const positiveMoves = pairs.filter((pair) => pair.scoreDelta > 0).length;
  return { field, sampleSize: pairs.length, positiveMoveRatio: pairs.length ? Math.round((positiveMoves / pairs.length) * 100) / 100 : null };
}
