import { updateChainProgression } from "./chainProgression";

function result(id, city, reputation = 60) {
  return { hotel: { id, city }, dailyReport: { progressionReport: { reputation } } };
}

test("chain_builder unlocks once there are 3+ hotels", () => {
  const { progression } = updateChainProgression({ results: [result("a", "Paris"), result("b", "Lyon"), result("c", "Nice")], totalProfit: 0 });
  expect(progression.achievements.some((a) => a.id === "chain_builder")).toBe(true);
});

test("chain_builder does not unlock with fewer than 3 hotels", () => {
  const { progression } = updateChainProgression({ results: [result("a", "Paris"), result("b", "Lyon")], totalProfit: 0 });
  expect(progression.achievements.some((a) => a.id === "chain_builder")).toBe(false);
});

test("multi_regional requires 3+ distinct cities, not just 3 hotels", () => {
  const sameCities = updateChainProgression({ results: [result("a", "Paris"), result("b", "Paris"), result("c", "Paris")], totalProfit: 0 });
  expect(sameCities.progression.achievements.some((a) => a.id === "multi_regional")).toBe(false);

  const distinctCities = updateChainProgression({ results: [result("a", "Paris"), result("b", "Lyon"), result("c", "Nice")], totalProfit: 0 });
  expect(distinctCities.progression.achievements.some((a) => a.id === "multi_regional")).toBe(true);
});

test("profitable_network unlocks only when the consolidated profit is positive", () => {
  expect(updateChainProgression({ results: [result("a", "Paris")], totalProfit: 100 }).progression.achievements.some((a) => a.id === "profitable_network")).toBe(true);
  expect(updateChainProgression({ results: [result("a", "Paris")], totalProfit: -100 }).progression.achievements.some((a) => a.id === "profitable_network")).toBe(false);
});

test("does not re-unlock an achievement already in the previous state", () => {
  const { progression } = updateChainProgression({
    results: [result("a", "Paris"), result("b", "Lyon"), result("c", "Nice")],
    totalProfit: 0,
    previousState: { unlockedAchievements: ["chain_builder"] },
  });
  expect(progression.achievements.some((a) => a.id === "chain_builder")).toBe(false);
});

test("chainReputation is the average reputation across every hotel's progressionReport", () => {
  const { progression } = updateChainProgression({ results: [result("a", "Paris", 80), result("b", "Lyon", 60)], totalProfit: 0 });
  expect(progression.chainReputation).toBe(70);
});

test("chainXP accumulates on top of the previous state instead of resetting", () => {
  const day1 = updateChainProgression({ results: [result("a", "Paris")], totalProfit: 500 });
  const day2 = updateChainProgression({ results: [result("a", "Paris")], totalProfit: 500, previousState: day1.nextState });
  expect(day2.progression.chainXP).toBeGreaterThan(day1.progression.chainXP);
});

test("chainLevel is derived from chainXP via lib/progression/levels.js", () => {
  const { progression } = updateChainProgression({ results: [result("a", "Paris")], totalProfit: 0 });
  expect(progression.chainLevel).toEqual(expect.objectContaining({ level: expect.any(Number), title: expect.any(String) }));
});

test("never throws with no arguments at all", () => {
  expect(() => updateChainProgression()).not.toThrow();
});
