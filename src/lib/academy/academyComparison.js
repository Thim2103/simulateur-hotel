// Compares every group in a class against each other, on their current
// score (mid-run) or final score (once finished) -- the data
// AcademyClass.jsx's comparison view and AcademyReview.jsx render.
import { safeArray } from "../safe";
import { buildGroupReport } from "./academyReports";

export function compareGroups(groups, runsByGroupId) {
  const reports = safeArray(groups).map((group) => buildGroupReport(group, runsByGroupId?.[group.id]));

  const ranked = [...reports].sort((a, b) => (b.currentScore ?? -Infinity) - (a.currentScore ?? -Infinity));

  return ranked.map((report, index) => ({
    rank: index + 1,
    groupId: report.groupId,
    groupName: report.groupName,
    status: report.status,
    currentScore: report.currentScore,
    objectivesAchieved: report.objectives.filter((objective) => objective.achieved).length,
    objectivesTotal: report.objectives.length,
  }));
}

// A per-objective breakdown across every group -- which objective is
// giving the whole class the most trouble, useful for a teacher deciding
// what to review before the debrief.
export function compareObjectives(groups, runsByGroupId) {
  const reports = safeArray(groups).map((group) => buildGroupReport(group, runsByGroupId?.[group.id]));
  const objectiveIds = [...new Set(reports.flatMap((report) => report.objectives.map((objective) => objective.id)))];

  return objectiveIds.map((objectiveId) => {
    const perGroup = reports.map((report) => {
      const objective = report.objectives.find((entry) => entry.id === objectiveId);
      return { groupId: report.groupId, groupName: report.groupName, achieved: Boolean(objective?.achieved), current: objective?.current ?? null };
    });
    return { objectiveId, achievedCount: perGroup.filter((entry) => entry.achieved).length, totalGroups: perGroup.length, perGroup };
  });
}
