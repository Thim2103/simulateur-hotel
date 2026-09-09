import { PRO_ACTION_CATALOG, findProAction, applyProDecision } from "./proActions";

function bundle(overrides = {}) {
  return {
    hotelState: {
      marketing: { budget: 1000, positioningTier: "midscale", channels: [{ id: "seo", enabled: true, budget: 300 }] },
      finance: { revenue: [1000], costs: [500], fixedCosts: 200 },
      rmAdvanced: {},
      restaurantAdvanced: {},
      esg: { sustainabilityScore: 50 },
      ...overrides.hotelState,
    },
    restaurantState: { menu: [], staff: [], finance: {}, ...overrides.restaurantState },
    rooms: [],
    reservations: [],
    ...overrides,
  };
}

test("catalog has 7 actions", () => {
  expect(PRO_ACTION_CATALOG).toHaveLength(7);
});

test("findProAction returns the matching action", () => {
  expect(findProAction("plan-relance-globale").label).toBe("Plan de relance globale");
});

test("findProAction returns null for an unknown id", () => {
  expect(findProAction("does-not-exist")).toBeNull();
});

test("plan-relance-globale increases the marketing budget", () => {
  const result = applyProDecision(bundle(), "plan-relance-globale");
  expect(result.hotelState.marketing.budget).toBeGreaterThan(1000);
});

test("plan-austerite reduces the marketing budget", () => {
  const result = applyProDecision(bundle(), "plan-austerite");
  expect(result.hotelState.marketing.budget).toBeLessThan(1000);
});

test("optimiser-distribution seeds the RM Advanced bonuses", () => {
  const result = applyProDecision(bundle(), "optimiser-distribution");
  expect(result.hotelState.rmAdvanced.adrBonus).toBeGreaterThan(0);
  expect(result.hotelState.rmAdvanced.directBookingBonus).toBeGreaterThan(0);
});

test("optimiser-fb seeds the Restaurant Advanced bonuses", () => {
  const result = applyProDecision(bundle(), "optimiser-fb");
  expect(result.hotelState.restaurantAdvanced.menuOptimizationBonus).toBeGreaterThan(0);
  expect(result.hotelState.restaurantAdvanced.wasteReductionBonus).toBeGreaterThan(0);
});

test("investir-durable raises the ESG sustainability score", () => {
  const result = applyProDecision(bundle(), "investir-durable");
  expect(result.hotelState.esg.sustainabilityScore).toBeGreaterThan(50);
});

test("an unknown action id returns the bundle unchanged", () => {
  const b = bundle();
  expect(applyProDecision(b, "unknown")).toBe(b);
});
