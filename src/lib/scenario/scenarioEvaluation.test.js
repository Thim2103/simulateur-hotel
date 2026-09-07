import { evaluateFinal, rankRuns } from "./scenarioEvaluation";
import { createScenarioTemplate } from "./scenarioSchema";

test("evaluateFinal grades the last score in scoreHistory", () => {
  const scenario = createScenarioTemplate("solo");
  const result = evaluateFinal(scenario, { scoreHistory: [40, 60, 90], objectivesStatus: { objectives: [] } });
  expect(result.finalScore).toBe(90);
  expect(result.grade).toBe("A");
  expect(result.passed).toBe(true);
});

test("evaluateFinal reports failure below the passing score", () => {
  const scenario = createScenarioTemplate("solo");
  const result = evaluateFinal(scenario, { scoreHistory: [10], objectivesStatus: { objectives: [] } });
  expect(result.grade).toBe("D");
  expect(result.passed).toBe(false);
});

test("evaluateFinal lists a recommendation per unmet objective", () => {
  const scenario = createScenarioTemplate("solo");
  const objectivesStatus = { objectives: [{ id: "o1", label: "ADR cible", current: 90, target: 150, achieved: false }] };
  const result = evaluateFinal(scenario, { scoreHistory: [50], objectivesStatus });
  expect(result.recommendations).toHaveLength(1);
  expect(result.recommendations[0]).toMatch(/ADR cible/);
});

test("rankRuns sorts by final score descending and assigns ranks", () => {
  const ranked = rankRuns([
    { id: "a", finalScore: 60 },
    { id: "b", finalScore: 90 },
    { id: "c", finalScore: 75 },
  ]);
  expect(ranked.map((entry) => entry.runId)).toEqual(["b", "c", "a"]);
  expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3]);
});
