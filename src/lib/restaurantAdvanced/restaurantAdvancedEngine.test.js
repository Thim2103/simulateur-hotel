import { runRestaurantAdvancedCycle, generateRestaurantAdvancedReport, restaurantAdvancedDiagnosticsToAnalytics } from "./restaurantAdvancedEngine";

const menu = [
  { id: 1, name: "Burger", category: "Plat", cost: 4, price: 16, sales: 100 },
  { id: 2, name: "Salade", category: "Entrée", cost: 2, price: 10, sales: 50 },
  { id: 3, name: "Tiramisu", category: "Dessert", cost: 5, price: 8, sales: 20 },
];

function bundle(overrides = {}) {
  return { hotelState: {}, restaurantState: { menu }, ...overrides };
}

test("runs a first cycle and produces a full state", () => {
  const state = runRestaurantAdvancedCycle({ hotelBundle: bundle() });
  expect(state.cyclesElapsed).toBe(1);
  expect(state.foodCost.overall).toBeGreaterThan(0);
  expect(state.profitability.grossMargin).toBeGreaterThan(0);
  expect(state.menuEngineering.items).toHaveLength(3);
  expect(state.forecast).toBeDefined();
});

test("handles an empty menu without throwing", () => {
  expect(() => runRestaurantAdvancedCycle({ hotelBundle: bundle({ restaurantState: { menu: [] } }) })).not.toThrow();
});

test("carries cyclesElapsed and replayLog forward across cycles", () => {
  const first = runRestaurantAdvancedCycle({ hotelBundle: bundle() });
  const second = runRestaurantAdvancedCycle({ hotelBundle: bundle(), previousState: first });
  expect(second.cyclesElapsed).toBe(2);
  expect(second.replayLog.entries).toHaveLength(2);
});

test("actions applied to hotelState.restaurantAdvanced feed into the next cycle", () => {
  const base = runRestaurantAdvancedCycle({ hotelBundle: bundle() });
  const boosted = runRestaurantAdvancedCycle({
    hotelBundle: bundle({ hotelState: { restaurantAdvanced: { pricingBonus: 20 } } }),
  });
  expect(boosted.profitability.grossMargin).toBeGreaterThan(base.profitability.grossMargin);
});

test("staffOverload feeds into diagnostics", () => {
  const state = runRestaurantAdvancedCycle({ hotelBundle: bundle(), staffOverload: 85 });
  expect(state.diagnostics.some((d) => /surcharge/i.test(d.message))).toBe(true);
});

test("esgWastePct feeds into diagnostics", () => {
  const state = runRestaurantAdvancedCycle({ hotelBundle: bundle(), esgWastePct: 70 });
  expect(state.diagnostics.some((d) => /gaspillage/i.test(d.message))).toBe(true);
});

test("clientsSatisfaction shifts popularity scores", () => {
  const low = runRestaurantAdvancedCycle({ hotelBundle: bundle(), clientsSatisfaction: 10 });
  const high = runRestaurantAdvancedCycle({ hotelBundle: bundle(), clientsSatisfaction: 95 });
  const lowSalade = low.popularity.items.find((item) => item.id === 2).popularity;
  const highSalade = high.popularity.items.find((item) => item.id === 2).popularity;
  expect(highSalade).toBeGreaterThan(lowSalade);
});

test("generateRestaurantAdvancedReport assembles the full report shape", () => {
  const state = runRestaurantAdvancedCycle({ hotelBundle: bundle() });
  const report = generateRestaurantAdvancedReport(state);
  expect(report.foodCost).toBeDefined();
  expect(report.profitability).toBeDefined();
  expect(report.menuEngineering).toBeDefined();
  expect(report.replay.totalCycles).toBe(1);
});

test("restaurantAdvancedDiagnosticsToAnalytics adapts to the analytics diagnostics shape", () => {
  const state = runRestaurantAdvancedCycle({ hotelBundle: bundle(), staffOverload: 90 });
  const analyticsDiags = restaurantAdvancedDiagnosticsToAnalytics(state.diagnostics);
  expect(analyticsDiags.every((d) => "type" in d && "severity" in d && "message" in d && "cycleIndex" in d)).toBe(true);
});
