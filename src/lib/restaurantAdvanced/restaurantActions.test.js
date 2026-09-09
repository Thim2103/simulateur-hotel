import { RESTAURANT_ACTION_CATALOG, findRestaurantAction, applyRestaurantAdvancedDecision } from "./restaurantActions";

test("catalog has 5 actions", () => {
  expect(RESTAURANT_ACTION_CATALOG).toHaveLength(5);
});

test("findRestaurantAction returns the matching action", () => {
  expect(findRestaurantAction("optimiser-carte").label).toBe("Optimiser la carte");
});

test("findRestaurantAction returns null for an unknown id", () => {
  expect(findRestaurantAction("does-not-exist")).toBeNull();
});

test("optimiser-carte increments menuOptimizationBonus", () => {
  const result = applyRestaurantAdvancedDecision({ hotelState: {} }, "optimiser-carte");
  expect(result.hotelState.restaurantAdvanced.menuOptimizationBonus).toBe(8);
});

test("reduire-pertes increments wasteReductionBonus", () => {
  const result = applyRestaurantAdvancedDecision({ hotelState: {} }, "reduire-pertes");
  expect(result.hotelState.restaurantAdvanced.wasteReductionBonus).toBe(10);
});

test("renegocier-fournisseurs increments supplierNegotiationBonus", () => {
  const result = applyRestaurantAdvancedDecision({ hotelState: {} }, "renegocier-fournisseurs");
  expect(result.hotelState.restaurantAdvanced.supplierNegotiationBonus).toBe(6);
});

test("repositionner-prix increments pricingBonus", () => {
  const result = applyRestaurantAdvancedDecision({ hotelState: {} }, "repositionner-prix");
  expect(result.hotelState.restaurantAdvanced.pricingBonus).toBe(5);
});

test("campagne-plats-signature increments popularityBonus and marketing reputationBonus", () => {
  const result = applyRestaurantAdvancedDecision({ hotelState: {} }, "campagne-plats-signature");
  expect(result.hotelState.restaurantAdvanced.popularityBonus).toBe(8);
  expect(result.hotelState.marketing.reputationBonus).toBe(3);
});

test("bonuses accumulate additively and clamp at their ceiling", () => {
  let bundle = { hotelState: {} };
  for (let i = 0; i < 10; i += 1) {
    bundle = applyRestaurantAdvancedDecision(bundle, "reduire-pertes");
  }
  expect(bundle.hotelState.restaurantAdvanced.wasteReductionBonus).toBe(40);
});

test("an unknown action id returns the bundle unchanged", () => {
  const bundle = { hotelState: { foo: "bar" } };
  expect(applyRestaurantAdvancedDecision(bundle, "unknown")).toBe(bundle);
});
