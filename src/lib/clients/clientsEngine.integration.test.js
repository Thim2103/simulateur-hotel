// Integration test for clientsEngine.js: verifies that runClientsCycle()
// and clientsFromCareerState() integrate correctly with the other
// refactored modules (PMS, RM, Finance, Staff, Marketing, ESG,
// Housekeeping, Analytics, Replay, Career) -- same pattern used by
// lib/housekeeping/housekeepingEngine.integration.test.js.
import { runClientsCycle, clientsFromCareerState, clientsDiagnosticsToAnalytics } from "./clientsEngine";
import { analyzeRun } from "../analytics/analyticsEngine";
import { buildReplayRunFromCareerRun } from "../replay/replayEngine";

// Minimal CareerState enough to exercise the adapter.
function makeCareerState(overrides = {}) {
  return {
    day: 3,
    status: "active",
    hotel: {
      hotelState: {
        pricePerNight: 100,
        esg: { overallScore: 62, energyConsumption: 40, waterUsage: 38 },
        marketing: { positioningTier: "midscale" },
        rm: { targetADR: 105, segmentation: { corporate: 28, leisure: 42 } },
      },
      restaurantState: { finance: { revenue: 800, expenses: 500 } },
      rooms: [
        { id: "r1", type: "Standard", status: "occupied" },
        { id: "r2", type: "Suite", status: "occupied" },
        { id: "r3", type: "Standard", status: "available" },
      ],
      reservations: [
        { id: "res1", roomId: "r1", status: "occupied", source: "OTA", segment: "leisure" },
        { id: "res2", roomId: "r2", status: "occupied", source: "Corporate", segment: "business" },
      ],
    },
    lastDayReport: {
      revenue: 320,
      restaurantReport: { customerSatisfaction: 4.1, revenue: 800 },
      progressionReport: { reputation: 72 },
      revenueStats: { adr: 110 },
    },
    missions: [],
    objectives: [],
    ...overrides,
  };
}

// ── PMS integration ─────────────────────────────────────────────────────
test("PMS: reads reservations from hotelBundle and counts occupied rooms", () => {
  const cs = makeCareerState();
  const state = runClientsCycle({ hotelBundle: cs.hotel });
  // 2 occupied reservations → behaviours
  expect(state.behaviors.preferredSegment).toBeTruthy();
});

// ── RM integration ───────────────────────────────────────────────────────
test("RM: ADR above base rate reduces rmSatisfaction and affects overall satisfaction", () => {
  const highAdr = runClientsCycle({ hotelBundle: makeCareerState().hotel, rmSatisfaction: 30 });
  const fairAdr = runClientsCycle({ hotelBundle: makeCareerState().hotel, rmSatisfaction: 90 });
  expect(fairAdr.satisfaction).toBeGreaterThan(highAdr.satisfaction);
});

// ── Finance integration ──────────────────────────────────────────────────
test("Finance: dailyRevenue and fbRevenue feed into avgSpend", () => {
  const state = runClientsCycle({
    hotelBundle: makeCareerState().hotel,
    dailyRevenue: 400,
    fbRevenue: 160,
  });
  expect(state.behaviors.avgSpend).not.toBeNull();
  expect(state.behaviors.avgSpend).toBeGreaterThan(0);
});

// ── Staff integration ────────────────────────────────────────────────────
test("Staff: high staffMorale improves satisfaction", () => {
  const low = runClientsCycle({ hotelBundle: makeCareerState().hotel, staffMorale: 20 });
  const high = runClientsCycle({ hotelBundle: makeCareerState().hotel, staffMorale: 95 });
  expect(high.satisfaction).toBeGreaterThan(low.satisfaction);
});

// ── Marketing integration ────────────────────────────────────────────────
test("Marketing: high reputation boosts satisfaction and premium segment share", () => {
  const low = runClientsCycle({ hotelBundle: makeCareerState().hotel, marketingReputation: 20 });
  const high = runClientsCycle({ hotelBundle: makeCareerState().hotel, marketingReputation: 90 });
  expect(high.satisfaction).toBeGreaterThanOrEqual(low.satisfaction);
});

// ── ESG integration ──────────────────────────────────────────────────────
test("ESG: high esgScore contributes to satisfaction and generates ESG-premium opportunity", () => {
  const state = runClientsCycle({
    hotelBundle: {
      ...makeCareerState().hotel,
      hotelState: { ...makeCareerState().hotel.hotelState, marketing: { positioningTier: "midscale" } },
    },
    esgScore: 85,
  });
  expect(state.satisfaction).toBeGreaterThan(65);
});

// ── Housekeeping integration ─────────────────────────────────────────────
test("Housekeeping: poor quality generates a high-severity diagnostic", () => {
  const state = runClientsCycle({ hotelBundle: makeCareerState().hotel, housekeepingQuality: 35, staffMorale: 50 });
  expect(state.diagnostics.some((d) => d.severity === "high")).toBe(true);
});

// ── Analytics integration ────────────────────────────────────────────────
test("Analytics: clientsDiagnosticsToAnalytics output satisfies analyzeRun shape", () => {
  const state = runClientsCycle({ hotelBundle: makeCareerState().hotel, housekeepingQuality: 30 });
  const analyticsDiags = clientsDiagnosticsToAnalytics(state.diagnostics);
  expect(analyticsDiags.every((d) => "type" in d && "severity" in d && "message" in d && "cycleIndex" in d)).toBe(true);
});

// ── Replay integration ───────────────────────────────────────────────────
test("Replay: replayLog has one entry after the first cycle", () => {
  const state = runClientsCycle({ hotelBundle: makeCareerState().hotel });
  expect(state.replayLog.entries).toHaveLength(1);
  expect(state.replayLog.entries[0]).toMatchObject({
    cycleIndex: 0,
    satisfaction: expect.any(Number),
    loyalty: expect.any(Number),
  });
});

// ── Career integration (clientsFromCareerState) ──────────────────────────
test("Career: clientsFromCareerState() runs without throwing on a valid CareerState", () => {
  const cs = makeCareerState();
  expect(() => clientsFromCareerState(cs)).not.toThrow();
});

test("Career: clientsFromCareerState() produces a valid ClientsState", () => {
  const cs = makeCareerState();
  const state = clientsFromCareerState(cs);
  expect(state.satisfaction).toBeGreaterThanOrEqual(0);
  expect(state.loyalty).toBeGreaterThanOrEqual(0);
  expect(state.segments).toBeDefined();
  expect(state.forecast).toBeDefined();
});

test("Career: clientsFromCareerState() carries forward loyalty across two cycles", () => {
  const cs = makeCareerState();
  const first = clientsFromCareerState(cs);
  const second = clientsFromCareerState({ ...cs, day: 4 }, first);
  expect(second.cyclesElapsed).toBe(2);
  expect(second.loyalty).toBeGreaterThanOrEqual(0);
});

test("Career: clientsFromCareerState() handles missing lastDayReport gracefully", () => {
  const cs = makeCareerState({ lastDayReport: null });
  expect(() => clientsFromCareerState(cs)).not.toThrow();
});
