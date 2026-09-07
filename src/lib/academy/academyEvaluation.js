// Generates the final, class-wide report a teacher reads once every group
// has finished a scenario: an overview of the class's performance plus
// each group's own graded verdict (see lib/scenario/scenarioEvaluation.js).
import { safeArray } from "../safe";
import { evaluateFinal } from "../scenario/scenarioEvaluation";
import { compareGroups } from "./academyComparison";

function average(numbers) {
  return numbers.length ? Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length) : 0;
}

export function generateFinalReport(classEntry, groups, runsByGroupId, assignment) {
  const groupReports = safeArray(groups).map((group) => {
    const run = runsByGroupId?.[group.id];
    const evaluation = run ? evaluateFinal(assignment?.scenario, run) : null;
    return { groupId: group.id, groupName: group.name, evaluation };
  });

  const finishedReports = groupReports.filter((entry) => entry.evaluation);
  const scores = finishedReports.map((entry) => entry.evaluation.finalScore);
  const ranking = compareGroups(groups, runsByGroupId);

  return {
    classId: classEntry?.id,
    className: classEntry?.name,
    scenarioTitle: assignment?.scenario?.title,
    groupCount: safeArray(groups).length,
    completedCount: finishedReports.length,
    classAverageScore: average(scores),
    bestGroup: ranking[0] || null,
    worstGroup: ranking[ranking.length - 1] || null,
    groupReports,
    ranking,
    generatedAt: new Date().toISOString(),
  };
}
