import { generateRewards } from "./rewards";

test("awards XP for each completed objective", () => {
  const rewards = generateRewards({ objectivesCompleted: [{ id: "profitable_day", name: "Journée rentable" }] });
  expect(rewards).toContainEqual(expect.objectContaining({ id: "objective_profitable_day", type: "xp" }));
});

test("awards a larger XP reward for each new achievement", () => {
  const rewards = generateRewards({ newAchievements: [{ id: "first_profit", name: "Premiers bénéfices" }] });
  const reward = rewards.find((r) => r.id === "achievement_first_profit");
  expect(reward.type).toBe("xp");
  expect(reward.amount).toBeGreaterThan(15); // more than a single objective's worth
});

test("awards a capital bonus on a level-up", () => {
  const rewards = generateRewards({ levelInfo: { level: 3, title: "Directeur d'établissement" }, previousLevel: 2 });
  expect(rewards).toContainEqual(expect.objectContaining({ type: "capital", amount: expect.any(Number) }));
});

test("does not award a level-up bonus when the level hasn't changed", () => {
  const rewards = generateRewards({ levelInfo: { level: 2, title: "Gérant confirmé" }, previousLevel: 2 });
  expect(rewards.some((r) => r.type === "capital")).toBe(false);
});

test("returns an empty list when nothing happened today", () => {
  expect(generateRewards({})).toEqual([]);
});

test("never throws with no arguments at all", () => {
  expect(() => generateRewards()).not.toThrow();
});
