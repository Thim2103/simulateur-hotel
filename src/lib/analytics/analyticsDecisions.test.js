import { analyzeDecisionField, analyzeDecisions, correlateDecisionWithScore } from "./analyticsDecisions";

function cycle(cycleIndex, decisions, score) {
  return { cycleIndex, decisions, score };
}

test("analyzeDecisionField counts how often a field was set and its average swing", () => {
  const cycles = [cycle(0, { pricingADR: 100 }), cycle(1, { pricingADR: 120 }), cycle(2, { pricingADR: 90 })];
  const result = analyzeDecisionField(cycles, "pricingADR");
  expect(result.timesSet).toBe(3);
  expect(result.averageSwing).toBe(25); // |120-100|=20, |90-120|=30 -> avg 25
});

test("analyzeDecisionField reports 0 for a field that was never set", () => {
  const cycles = [cycle(0, {})];
  expect(analyzeDecisionField(cycles, "pricingADR")).toEqual({ field: "pricingADR", timesSet: 0, averageSwing: 0 });
});

test("analyzeDecisions discovers every field used across the run", () => {
  const cycles = [cycle(0, { pricingADR: 100 }), cycle(1, { headcount: 5 })];
  const result = analyzeDecisions(cycles);
  expect(result.fields.map((f) => f.field).sort()).toEqual(["headcount", "pricingADR"]);
  expect(result.totalCyclesWithDecisions).toBe(2);
});

test("correlateDecisionWithScore pairs a decision with the following cycle's score delta", () => {
  const cycles = [cycle(0, { pricingADR: 100 }, 40), cycle(1, {}, 60), cycle(2, { pricingADR: 120 }, 50)];
  const result = correlateDecisionWithScore(cycles, "pricingADR");
  // Only cycle 0 has both a decision and a following cycle to pair against
  // (cycle 2's decision has no "next" cycle within the run).
  expect(result.sampleSize).toBe(1);
  expect(result.positiveMoveRatio).toBe(1); // the one pair (+20) was positive
});

test("correlateDecisionWithScore handles a field never used", () => {
  const cycles = [cycle(0, {}, 40), cycle(1, {}, 60)];
  expect(correlateDecisionWithScore(cycles, "pricingADR")).toEqual({ field: "pricingADR", sampleSize: 0, positiveMoveRatio: null });
});
