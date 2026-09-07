import { evaluateCareerObjectives, newlyAchieved, seedObjectives } from "./careerObjectives";

test("seedObjectives starts every objective as not achieved", () => {
  const objectives = seedObjectives();
  expect(objectives.every((objective) => objective.achieved === false)).toBe(true);
});

test("evaluateCareerObjectives marks an objective achieved once its KPI condition is met", () => {
  const objectives = seedObjectives();
  const result = evaluateCareerObjectives(objectives, { profit: 500 });
  expect(result.find((o) => o.id === "first-profit").achieved).toBe(true);
});

test("evaluateCareerObjectives reads a nested KPI path", () => {
  const objectives = seedObjectives();
  const result = evaluateCareerObjectives(objectives, { progressionReport: { reputation: 75 } });
  expect(result.find((o) => o.id === "reputation-60").achieved).toBe(true);
});

test("newlyAchieved reports only objectives that flipped to achieved", () => {
  const before = seedObjectives();
  const after = evaluateCareerObjectives(before, { profit: 500 });
  expect(newlyAchieved(before, after).map((o) => o.id)).toEqual(["first-profit"]);
  expect(newlyAchieved(after, after)).toEqual([]);
});
