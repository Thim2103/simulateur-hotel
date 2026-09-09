import { RM_ADVANCED_ACTION_CATALOG, findRmAdvancedAction, applyRmAdvancedDecision } from "./rmAdvancedActions";

test("catalog has 5 actions", () => {
  expect(RM_ADVANCED_ACTION_CATALOG).toHaveLength(5);
});

test("findRmAdvancedAction returns the matching action", () => {
  expect(findRmAdvancedAction("augmenter-adr").label).toBe("Augmenter l'ADR");
});

test("findRmAdvancedAction returns null for an unknown id", () => {
  expect(findRmAdvancedAction("does-not-exist")).toBeNull();
});

test("augmenter-adr increments adrBonus", () => {
  const result = applyRmAdvancedDecision({ hotelState: {} }, "augmenter-adr");
  expect(result.hotelState.rmAdvanced.adrBonus).toBe(8);
});

test("optimiser-mix-segments increments mixOptimizationBonus", () => {
  const result = applyRmAdvancedDecision({ hotelState: {} }, "optimiser-mix-segments");
  expect(result.hotelState.rmAdvanced.mixOptimizationBonus).toBe(10);
});

test("reduire-dependance-ota increments directBookingBonus", () => {
  const result = applyRmAdvancedDecision({ hotelState: {} }, "reduire-dependance-ota");
  expect(result.hotelState.rmAdvanced.directBookingBonus).toBe(10);
});

test("activer-pricing-evenementiel increments eventPricingBonus", () => {
  const result = applyRmAdvancedDecision({ hotelState: {} }, "activer-pricing-evenementiel");
  expect(result.hotelState.rmAdvanced.eventPricingBonus).toBe(8);
});

test("cibler-corporate-premium increments corporatePremiumBonus and marketing reputationBonus", () => {
  const result = applyRmAdvancedDecision({ hotelState: {} }, "cibler-corporate-premium");
  expect(result.hotelState.rmAdvanced.corporatePremiumBonus).toBe(8);
  expect(result.hotelState.marketing.reputationBonus).toBe(3);
});

test("bonuses accumulate additively and clamp at their ceiling", () => {
  let bundle = { hotelState: {} };
  for (let i = 0; i < 10; i += 1) {
    bundle = applyRmAdvancedDecision(bundle, "optimiser-mix-segments");
  }
  expect(bundle.hotelState.rmAdvanced.mixOptimizationBonus).toBe(40);
});

test("an unknown action id returns the bundle unchanged", () => {
  const bundle = { hotelState: { foo: "bar" } };
  expect(applyRmAdvancedDecision(bundle, "unknown")).toBe(bundle);
});
