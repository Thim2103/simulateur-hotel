import { generateStorylineEvents } from "./storyline";

test("fires a level-up beat when the level increased", () => {
  const events = generateStorylineEvents({ levelInfo: { level: 3, title: "Directeur d'établissement" }, previousLevel: 2 });
  expect(events.some((e) => e.id === "level_up_3")).toBe(true);
});

test("does not fire a level-up beat when the level is unchanged", () => {
  const events = generateStorylineEvents({ levelInfo: { level: 2, title: "Gérant confirmé" }, previousLevel: 2 });
  expect(events.some((e) => e.id.startsWith("level_up"))).toBe(false);
});

test("fires one beat per new achievement", () => {
  const events = generateStorylineEvents({
    newAchievements: [
      { id: "first_profit", name: "Premiers bénéfices", description: "..." },
      { id: "team_builder", name: "Bâtisseur d'équipe", description: "..." },
    ],
  });
  expect(events.some((e) => e.id === "achievement_first_profit")).toBe(true);
  expect(events.some((e) => e.id === "achievement_team_builder")).toBe(true);
});

test("fires a day-milestone beat only on round-number days", () => {
  expect(generateStorylineEvents({ cycles: 30 }).some((e) => e.id === "day_milestone_30")).toBe(true);
  expect(generateStorylineEvents({ cycles: 31 }).some((e) => e.id.startsWith("day_milestone"))).toBe(false);
});

test("fires a press feature only the day reputation crosses 95, not every day after", () => {
  const crossing = generateStorylineEvents({ reputation: 96, previousReputation: 90 });
  const staying = generateStorylineEvents({ reputation: 96, previousReputation: 95 });
  expect(crossing.some((e) => e.id === "press_feature")).toBe(true);
  expect(staying.some((e) => e.id === "press_feature")).toBe(false);
});

test("returns an empty list on a quiet day with no milestones", () => {
  expect(generateStorylineEvents({ cycles: 5, reputation: 50, previousReputation: 50 })).toEqual([]);
});

test("never throws with no arguments at all", () => {
  expect(() => generateStorylineEvents()).not.toThrow();
});
