import { runClientsCycle, generateClientsReport, clientsDiagnosticsToAnalytics } from "./clientsEngine";

const BASE_BUNDLE = {
  hotelState: {},
  restaurantState: {},
  rooms: [{ id: "r1", type: "Standard" }],
  reservations: [{ id: "res1", status: "occupied" }],
};

test("runClientsCycle returns a valid ClientsState", () => {
  const state = runClientsCycle({ hotelBundle: BASE_BUNDLE });
  expect(state).toMatchObject({
    segments: expect.objectContaining({ business: expect.any(Number) }),
    satisfaction: expect.any(Number),
    loyalty: expect.any(Number),
    reviews: expect.objectContaining({ avgRating: expect.any(Number) }),
    behaviors: expect.objectContaining({ returnRate: expect.any(Number) }),
    diagnostics: expect.any(Array),
    forecast: expect.objectContaining({ scenarios: expect.any(Object) }),
    cyclesElapsed: 1,
  });
});

test("satisfaction is within 0-100", () => {
  const state = runClientsCycle({ hotelBundle: BASE_BUNDLE, housekeepingQuality: 80, staffMorale: 70 });
  expect(state.satisfaction).toBeGreaterThanOrEqual(0);
  expect(state.satisfaction).toBeLessThanOrEqual(100);
});

test("loyalty grows over multiple cycles with high satisfaction", () => {
  let prev = null;
  for (let i = 0; i < 5; i += 1) {
    prev = runClientsCycle({ hotelBundle: BASE_BUNDLE, housekeepingQuality: 90, staffMorale: 85, previousState: prev });
  }
  expect(prev.loyalty).toBeGreaterThan(50);
});

test("cyclesElapsed increments each call", () => {
  const first = runClientsCycle({ hotelBundle: BASE_BUNDLE });
  const second = runClientsCycle({ hotelBundle: BASE_BUNDLE, previousState: first });
  expect(second.cyclesElapsed).toBe(2);
});

test("replayLog accumulates entries", () => {
  const first = runClientsCycle({ hotelBundle: BASE_BUNDLE });
  const second = runClientsCycle({ hotelBundle: BASE_BUNDLE, previousState: first });
  expect(second.replayLog.entries).toHaveLength(2);
});

test("applying programme-fidelite action boosts loyalty", () => {
  const bundleWithAction = {
    ...BASE_BUNDLE,
    hotelState: { clients: { loyaltyBonus: 10 } },
  };
  const withBonus = runClientsCycle({ hotelBundle: bundleWithAction, housekeepingQuality: 70 });
  const withoutBonus = runClientsCycle({ hotelBundle: BASE_BUNDLE, housekeepingQuality: 70 });
  expect(withBonus.loyalty).toBeGreaterThan(withoutBonus.loyalty);
});

test("generateClientsReport includes replay entries and forecast", () => {
  const state = runClientsCycle({ hotelBundle: BASE_BUNDLE });
  const report = generateClientsReport(state);
  expect(report.replay.totalCycles).toBe(1);
  expect(report.forecast).toBeDefined();
  expect(report.diagnostics).toBeInstanceOf(Array);
});

test("clientsDiagnosticsToAnalytics maps to analytics shape", () => {
  const diags = [{ type: "error", severity: "high", message: "Test diagnostic." }];
  const mapped = clientsDiagnosticsToAnalytics(diags);
  expect(mapped[0]).toMatchObject({ type: "error", severity: "high", message: "Test diagnostic.", cycleIndex: null });
});

test("handles null hotelBundle without throwing", () => {
  expect(() => runClientsCycle({ hotelBundle: null })).not.toThrow();
});
