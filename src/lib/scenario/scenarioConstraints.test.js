import { applyConstraints, checkConstraints } from "./scenarioConstraints";

test("checkConstraints flags a pricing decision below the scenario's minADR", () => {
  const violations = checkConstraints({}, { pricingADR: 50 }, { pricing: { minADR: 80 } });
  expect(violations).toEqual([expect.objectContaining({ field: "pricing.minADR" })]);
});

test("checkConstraints flags a pricing decision above the scenario's maxADR", () => {
  const violations = checkConstraints({}, { pricingADR: 500 }, { pricing: { maxADR: 300 } });
  expect(violations).toEqual([expect.objectContaining({ field: "pricing.maxADR" })]);
});

test("checkConstraints flags a forbidden action", () => {
  const violations = checkConstraints({}, { action: "expansion" }, { forbiddenActions: ["expansion"] });
  expect(violations).toEqual([expect.objectContaining({ field: "forbiddenActions" })]);
});

test("checkConstraints returns no violations when everything is within bounds", () => {
  expect(checkConstraints({}, { pricingADR: 120 }, { pricing: { minADR: 80, maxADR: 300 } })).toEqual([]);
});

test("applyConstraints seeds the starting cash from budget.startingCash", () => {
  const { state } = applyConstraints({}, { budget: { startingCash: 5000 } });
  expect(state.cash).toBe(5000);
});

test("applyConstraints is a no-op when there is no budget constraint", () => {
  const { state, violations } = applyConstraints({ existing: true }, {});
  expect(state).toEqual({ existing: true });
  expect(violations).toEqual([]);
});
