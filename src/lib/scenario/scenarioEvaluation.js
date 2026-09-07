// Turns a finished run's score history into a final verdict (grade,
// pass/fail, recommendations), and ranks several runs of the same
// scenario against each other (used by Academy's group comparison and,
// eventually, Competition's leaderboard).
import { safeArray, safeNumber, safeObject } from "../safe";

function gradeFor(score, grading) {
  const tier = safeArray(grading).find((entry) => score >= safeNumber(entry.minScore, 0) && score <= safeNumber(entry.maxScore, 100));
  return tier || { grade: "?", label: "Non noté" };
}

function recommendationsFor(objectivesResult) {
  return safeArray(objectivesResult?.objectives)
    .filter((objective) => !objective.achieved)
    .map((objective) => `Objectif non atteint : ${objective.label || objective.id} (actuel : ${objective.current ?? "—"}, cible : ${objective.target}).`);
}

// runState: { scoreHistory: number[], objectivesStatus, evaluation config }
export function evaluateFinal(scenario, runState) {
  const evaluation = safeObject(scenario?.evaluation);
  const scoreHistory = safeArray(runState?.scoreHistory);
  const finalScore = scoreHistory.length ? scoreHistory[scoreHistory.length - 1] : 0;
  const tier = gradeFor(finalScore, evaluation.grading);

  return {
    finalScore,
    grade: tier.grade,
    gradeLabel: tier.label,
    passed: finalScore >= safeNumber(evaluation.passingScore, 50),
    objectivesResults: safeObject(runState?.objectivesStatus).objectives || [],
    recommendations: recommendationsFor(runState?.objectivesStatus),
  };
}

// Ranks multiple runs of the same scenario by final score, descending.
// Ties keep their relative input order (Array#sort stability) and share
// no special rank-collapsing -- rank is simply position + 1.
export function rankRuns(runs) {
  return safeArray(runs)
    .map((run) => ({ runId: run.id ?? run.runId, ownerLabel: run.ownerLabel, finalScore: safeNumber(run.finalScore ?? run.scoreHistory?.[run.scoreHistory.length - 1], 0) }))
    .sort((a, b) => b.finalScore - a.finalScore)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
