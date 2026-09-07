// Bridges Career to the existing lib/progression/progressionEngine.js
// instead of duplicating XP/level/reputation math: runDailyCycle() already
// runs progressionEngine once per cycle and returns its result as
// dailyReport.progressionReport -- this file only extracts a
// career-friendly snapshot of it for CareerDashboard.jsx to display.
import { safeObject } from "../safe";

export function progressionSnapshot(dailyReport) {
  const report = safeObject(dailyReport?.progressionReport);
  return {
    xp: report.xp ?? 0,
    level: report.level?.level ?? 1,
    levelTitle: report.level?.title ?? "",
    reputation: report.reputation ?? null,
    newAchievements: report.newAchievements || [],
    objectivesCompleted: report.objectivesCompleted || [],
  };
}
