import { progressionSnapshot } from "./careerProgression";

test("progressionSnapshot extracts a career-friendly summary from the DailyReport", () => {
  const dailyReport = {
    progressionReport: {
      xp: 120,
      level: { level: 3, title: "Gérant confirmé" },
      reputation: 72,
      newAchievements: [{ id: "first_profit" }],
      objectivesCompleted: [{ id: "obj1" }],
    },
  };
  expect(progressionSnapshot(dailyReport)).toEqual({
    xp: 120,
    level: 3,
    levelTitle: "Gérant confirmé",
    reputation: 72,
    newAchievements: [{ id: "first_profit" }],
    objectivesCompleted: [{ id: "obj1" }],
  });
});

test("progressionSnapshot defaults gracefully when the report is missing fields", () => {
  expect(progressionSnapshot({})).toEqual({ xp: 0, level: 1, levelTitle: "", reputation: null, newAchievements: [], objectivesCompleted: [] });
  expect(progressionSnapshot(null)).toEqual({ xp: 0, level: 1, levelTitle: "", reputation: null, newAchievements: [], objectivesCompleted: [] });
});
