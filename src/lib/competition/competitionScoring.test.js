import { currentScoreForPlayer, scoreHistoryForPlayer, validateCommonScoring } from "./competitionScoring";

test("validateCommonScoring requires both scoring weights and a shared seed", () => {
  expect(validateCommonScoring({}).valid).toBe(false);
  expect(validateCommonScoring({ scoring: { weights: { finance: 1 } } }).valid).toBe(false);
  expect(validateCommonScoring({ scoring: { weights: { finance: 1 } }, replay: { seed: "s1" } }).valid).toBe(true);
});

test("currentScoreForPlayer returns the last entry of scoreHistory, or null", () => {
  expect(currentScoreForPlayer({ scoreHistory: [10, 20, 30] })).toBe(30);
  expect(currentScoreForPlayer({ scoreHistory: [] })).toBeNull();
  expect(currentScoreForPlayer(null)).toBeNull();
});

test("scoreHistoryForPlayer is defensive against a missing run", () => {
  expect(scoreHistoryForPlayer(null)).toEqual([]);
  expect(scoreHistoryForPlayer({ scoreHistory: [5] })).toEqual([5]);
});
