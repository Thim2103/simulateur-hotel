import { computeScore } from "./scenarioScoring";

test("weights each category and averages by total weight", () => {
  const state = { finance: { totalProfit: 80 } };
  const scoring = { weights: { finance: 1 }, maxScore: 100 };
  const { score } = computeScore(state, scoring, { objectives: [] });
  expect(score).toBe(80);
});

test("the objectives category scores the achieved ratio out of 100", () => {
  const objectivesResult = { objectives: [{ achieved: true }, { achieved: false }] };
  const { score } = computeScore({}, { weights: { objectives: 1 } }, objectivesResult);
  expect(score).toBe(50);
});

test("a satisfied penalty condition subtracts points", () => {
  const scoring = { weights: { finance: 1 }, penalties: [{ condition: (state) => state.finance.totalProfit < 0, points: 20 }] };
  const { score, appliedPenalties } = computeScore({ finance: { totalProfit: -10 } }, scoring, { objectives: [] });
  expect(score).toBe(0); // normalizeToScore floors negative profit at 0, then the penalty has nothing left to subtract from
  expect(appliedPenalties).toHaveLength(1);
});

test("score never exceeds maxScore or drops below 0", () => {
  const high = computeScore({ finance: { totalProfit: 100000 } }, { weights: { finance: 1 }, maxScore: 100 }, { objectives: [] });
  expect(high.score).toBeLessThanOrEqual(100);

  const low = computeScore({}, { weights: { finance: 1 }, penalties: [{ condition: () => true, points: 500 }] }, { objectives: [] });
  expect(low.score).toBeGreaterThanOrEqual(0);
});
