// Shapes a group's run into the reports a teacher/student actually reads:
// the daily cycle-by-cycle history (from the scenario's own replay log)
// and a compact summary of where the group currently stands.
import { safeArray } from "../safe";
import { buildReplay } from "../scenario/scenarioReplay";

export function collectDailyReports(runState) {
  return buildReplay(runState?.replayLog).entries;
}

export function buildGroupReport(group, runState) {
  const dailyReports = collectDailyReports(runState);
  const objectives = safeArray(runState?.objectivesStatus?.objectives);

  return {
    groupId: group.id,
    groupName: group.name,
    status: runState?.status || "not_started",
    cycleIndex: runState?.cycleIndex || 0,
    totalCycles: runState?.totalCycles || 0,
    currentScore: runState?.scoreHistory?.length ? runState.scoreHistory[runState.scoreHistory.length - 1] : null,
    scoreHistory: safeArray(runState?.scoreHistory),
    objectives,
    dailyReports,
  };
}

// Every group's report for a class in one call -- the shape
// AcademyClass.jsx's progress table and AcademyReview.jsx's export both
// consume.
export function buildClassReports(groups, runsByGroupId) {
  return safeArray(groups).map((group) => buildGroupReport(group, runsByGroupId?.[group.id]));
}
