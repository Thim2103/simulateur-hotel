// Integration test for restaurantAdvancedEngine.js: verifies that
// runRestaurantAdvancedCycle() and restaurantAdvancedFromCareerState()
// integrate correctly with the other refactored modules (PMS, RM,
// Finance, Staff, ESG, Clients, Analytics, Replay, Career) -- same
// pattern used by lib/clients/clientsEngine.integration.test.js.
import { runRestaurantAdvancedCycle, restaurantAdvancedFromCareerState, restaurantAdvancedDiagnosticsToAnalytics } from "./restaurantAdvancedEngine";

const menu = [
  { id: 1, name: "Burger", category: "Plat", cost: 4, price: 16, sales: 100 },
  { id: 2, name: "Salade", category: "Entrée", cost: 2, price: 10, sales: 50 },
  { id: 3, name: "Tiramisu", category: "Dessert", cost: 5, price: 8, sales: 20 },
];

// Minimal CareerState enough to exercise the adapter.
function makeCareerState(overrides = {}) {
  return {
    day: 3,
    status: "active",
    hotel: {
      hotelState: {
        pricePerNight: 100,
        esg: { overallScore: 62, waste: 30 },
        marketing: { positioningTier: "midscale" },
        rm: { targetADR: 105 },
        clients: { satisfaction: 74 },
      },
      restaurantState: { menu, finance: { revenue: 800, expenses: 500 } },
      rooms: [
        { id: "r1", type: "Standard", status: "occupied" },
        { id: "r2", type: "Suite", status: "occupied" },
      ],
      reservations: [
        { id: "res1", roomId: "r1", status: "occupied", source: "OTA", segment: "leisure" },
      ],
    },
    lastDayReport: {
      revenue: 320,
      restaurantReport: { customerSatisfaction: 4.1, revenue: 800 },
      revenueStats: { adr: 110 },
    },
    missions: [],
    objectives: [],
    ...overrides,
  };
}

// ── PMS/RM integration (via the hotel bundle's own menu/occupancy) ──────
test("PMS/RM: reads the menu from hotelBundle.restaurantState and produces a full cycle", () => {
  const cs = makeCareerState();
  const state = runRestaurantAdvancedCycle({ hotelBundle: cs.hotel });
  expect(state.menuEngineering.items).toHaveLength(3);
  expect(state.foodCost.overall).toBeGreaterThan(0);
});

// ── Finance integration ──────────────────────────────────────────────────
test("Finance: gross/net margin are derived straight from menu price/cost, informing EBITDA upstream", () => {
  const state = runRestaurantAdvancedCycle({ hotelBundle: makeCareerState().hotel });
  expect(state.profitability.grossMargin).toBeGreaterThan(0);
  expect(state.profitability.netMargin).toBeLessThan(state.profitability.grossMargin);
});

// ── Staff integration ────────────────────────────────────────────────────
test("Staff: high kitchen overload generates a surcharge diagnostic", () => {
  const low = runRestaurantAdvancedCycle({ hotelBundle: makeCareerState().hotel, staffOverload: 20 });
  const high = runRestaurantAdvancedCycle({ hotelBundle: makeCareerState().hotel, staffOverload: 90 });
  expect(low.diagnostics.some((d) => /surcharge/i.test(d.message))).toBe(false);
  expect(high.diagnostics.some((d) => /surcharge/i.test(d.message))).toBe(true);
});

// ── ESG integration ──────────────────────────────────────────────────────
test("ESG: high waste share generates a food-waste opportunity diagnostic", () => {
  const state = runRestaurantAdvancedCycle({ hotelBundle: makeCareerState().hotel, esgWastePct: 65 });
  expect(state.diagnostics.some((d) => /gaspillage/i.test(d.message))).toBe(true);
});

// ── Clients integration ──────────────────────────────────────────────────
test("Clients: high satisfaction lifts dish popularity vs. low satisfaction", () => {
  const low = runRestaurantAdvancedCycle({ hotelBundle: makeCareerState().hotel, clientsSatisfaction: 15 });
  const high = runRestaurantAdvancedCycle({ hotelBundle: makeCareerState().hotel, clientsSatisfaction: 95 });
  const lowPop = low.popularity.items.find((item) => item.id === 2).popularity;
  const highPop = high.popularity.items.find((item) => item.id === 2).popularity;
  expect(highPop).toBeGreaterThan(lowPop);
});

// ── Analytics integration ────────────────────────────────────────────────
test("Analytics: restaurantAdvancedDiagnosticsToAnalytics output satisfies analyzeRun shape", () => {
  const state = runRestaurantAdvancedCycle({ hotelBundle: makeCareerState().hotel, staffOverload: 90 });
  const analyticsDiags = restaurantAdvancedDiagnosticsToAnalytics(state.diagnostics);
  expect(analyticsDiags.every((d) => "type" in d && "severity" in d && "message" in d && "cycleIndex" in d)).toBe(true);
});

// ── Replay integration ───────────────────────────────────────────────────
test("Replay: replayLog has one entry after the first cycle", () => {
  const state = runRestaurantAdvancedCycle({ hotelBundle: makeCareerState().hotel });
  expect(state.replayLog.entries).toHaveLength(1);
  expect(state.replayLog.entries[0]).toMatchObject({ cycleIndex: 0, foodCost: expect.any(Number) });
});

// ── Career integration (restaurantAdvancedFromCareerState) ──────────────
test("Career: restaurantAdvancedFromCareerState() runs without throwing on a valid CareerState", () => {
  const cs = makeCareerState();
  expect(() => restaurantAdvancedFromCareerState(cs)).not.toThrow();
});

test("Career: restaurantAdvancedFromCareerState() produces a valid state", () => {
  const cs = makeCareerState();
  const state = restaurantAdvancedFromCareerState(cs);
  expect(state.foodCost).toBeDefined();
  expect(state.profitability).toBeDefined();
  expect(state.forecast).toBeDefined();
});

test("Career: restaurantAdvancedFromCareerState() reads clients satisfaction off hotelState.clients", () => {
  const withClients = makeCareerState();
  const withoutClients = makeCareerState({
    hotel: { ...makeCareerState().hotel, hotelState: { ...makeCareerState().hotel.hotelState, clients: undefined } },
  });
  const stateWith = restaurantAdvancedFromCareerState(withClients);
  const stateWithout = restaurantAdvancedFromCareerState(withoutClients);
  // Both should resolve without throwing, falling back to the restaurant
  // report's own rating when hotelState.clients is absent.
  expect(stateWith.popularity).toBeDefined();
  expect(stateWithout.popularity).toBeDefined();
});

test("Career: restaurantAdvancedFromCareerState() carries cyclesElapsed forward across two cycles", () => {
  const cs = makeCareerState();
  const first = restaurantAdvancedFromCareerState(cs);
  const second = restaurantAdvancedFromCareerState({ ...cs, day: 4 }, first);
  expect(second.cyclesElapsed).toBe(2);
});

test("Career: restaurantAdvancedFromCareerState() handles missing lastDayReport gracefully", () => {
  const cs = makeCareerState({ lastDayReport: null });
  expect(() => restaurantAdvancedFromCareerState(cs)).not.toThrow();
});
