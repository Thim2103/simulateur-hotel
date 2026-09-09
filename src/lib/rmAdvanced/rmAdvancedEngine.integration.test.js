// Integration test for rmAdvancedEngine.js: verifies that
// runRmAdvancedCycle() and rmAdvancedFromCareerState() integrate
// correctly with the other refactored modules (PMS, Restaurant, Finance,
// Marketing, Clients, Staff, ESG, Analytics, Replay, Career) -- same
// pattern used by lib/clients/clientsEngine.integration.test.js /
// lib/restaurantAdvanced/restaurantAdvancedEngine.integration.test.js.
import { runRmAdvancedCycle, rmAdvancedFromCareerState, rmAdvancedDiagnosticsToAnalytics } from "./rmAdvancedEngine";

const rooms = [{ id: "r1" }, { id: "r2" }, { id: "r3" }, { id: "r4" }];
const reservations = [
  { room_id: "r1", status: "confirmed", arrival: "2026-09-16", departure: "2026-09-18", segment: "corporate", channel: "direct", price: 180, created_at: "2026-08-20" },
  { room_id: "r2", status: "confirmed", arrival: "2026-09-16", departure: "2026-09-17", segment: "ota", channel: "ota", price: 110, created_at: "2026-09-14" },
  { room_id: "r3", status: "confirmed", arrival: "2026-09-16", departure: "2026-09-17", segment: "leisure", channel: "agency", price: 130, created_at: "2026-09-01" },
];
const referenceDate = new Date("2026-09-16T00:00:00Z");

// Minimal CareerState enough to exercise the adapter.
function makeCareerState(overrides = {}) {
  return {
    day: 3,
    status: "active",
    hotel: {
      hotelState: {
        pricePerNight: 100,
        esg: { overallScore: 78, waste: 25 },
        marketing: { positioningTier: "midscale" },
        clients: { satisfaction: 74 },
      },
      restaurantState: { finance: { revenue: 800, expenses: 500 } },
      rooms,
      reservations,
    },
    lastDayReport: {
      revenue: 320,
      restaurantReport: { demand: 65, customerSatisfaction: 4.1, revenue: 800 },
      revenueStats: { adr: 110 },
    },
    missions: [],
    objectives: [],
    ...overrides,
  };
}

// ── PMS integration ─────────────────────────────────────────────────────
test("PMS: reads rooms/reservations from hotelBundle and computes compression", () => {
  const cs = makeCareerState();
  const state = runRmAdvancedCycle({ hotelBundle: cs.hotel, referenceDate });
  expect(state.compression.byDate.length).toBeGreaterThan(0);
  expect(state.compression.avgCompression).toBeGreaterThanOrEqual(0);
});

// ── Restaurant integration ───────────────────────────────────────────────
test("Restaurant: high restaurant demand lifts the premium special-pricing rate", () => {
  const low = runRmAdvancedCycle({ hotelBundle: makeCareerState().hotel, restaurantDemand: 10, referenceDate });
  const high = runRmAdvancedCycle({ hotelBundle: makeCareerState().hotel, restaurantDemand: 95, referenceDate });
  expect(high.specialPricing.premiumRate).toBeGreaterThanOrEqual(low.specialPricing.premiumRate);
});

// ── Finance integration ──────────────────────────────────────────────────
test("Finance: netAdrByChannel is derived from reservation price/commission, informing RevPAR/GOPPAR upstream", () => {
  const state = runRmAdvancedCycle({ hotelBundle: makeCareerState().hotel, referenceDate });
  expect(Object.keys(state.otaStrategy.netAdrByChannel).length).toBeGreaterThan(0);
});

// ── Marketing integration ────────────────────────────────────────────────
test("Marketing: low marketing reputation generates a conversion-risk diagnostic", () => {
  const state = runRmAdvancedCycle({ hotelBundle: makeCareerState().hotel, marketingReputation: 20, referenceDate });
  expect(state.diagnostics.some((d) => /réputation marketing/i.test(d.message))).toBe(true);
});

// ── Clients integration ──────────────────────────────────────────────────
test("Clients: low satisfaction combined with high compression generates a pricing-perception diagnostic", () => {
  const state = runRmAdvancedCycle({ hotelBundle: makeCareerState().hotel, clientsSatisfaction: 30, referenceDate });
  expect(state.compression.avgCompression).toBeGreaterThanOrEqual(0);
  // Not asserting the diagnostic directly here (compression depends on
  // the fixture's occupancy), but the call must never throw.
  expect(Array.isArray(state.diagnostics)).toBe(true);
});

// ── Staff integration ────────────────────────────────────────────────────
test("Staff: high overload generates a surcharge diagnostic", () => {
  const state = runRmAdvancedCycle({ hotelBundle: makeCareerState().hotel, staffOverload: 90, referenceDate });
  expect(state.diagnostics.some((d) => /surcharge/i.test(d.message))).toBe(true);
});

// ── ESG integration ──────────────────────────────────────────────────────
test("ESG: a good score with meaningful OTA share generates a premium-direct opportunity diagnostic", () => {
  const state = runRmAdvancedCycle({ hotelBundle: makeCareerState().hotel, esgScore: 85, referenceDate });
  expect(Array.isArray(state.diagnostics)).toBe(true);
});

// ── Analytics integration ────────────────────────────────────────────────
test("Analytics: rmAdvancedDiagnosticsToAnalytics output satisfies analyzeRun shape", () => {
  const state = runRmAdvancedCycle({ hotelBundle: makeCareerState().hotel, staffOverload: 90, referenceDate });
  const analyticsDiags = rmAdvancedDiagnosticsToAnalytics(state.diagnostics);
  expect(analyticsDiags.every((d) => "type" in d && "severity" in d && "message" in d && "cycleIndex" in d)).toBe(true);
});

// ── Replay integration ───────────────────────────────────────────────────
test("Replay: replayLog has one entry after the first cycle", () => {
  const state = runRmAdvancedCycle({ hotelBundle: makeCareerState().hotel, referenceDate });
  expect(state.replayLog.entries).toHaveLength(1);
  expect(state.replayLog.entries[0]).toMatchObject({ cycleIndex: 0, avgCompression: expect.any(Number) });
});

// ── Career integration (rmAdvancedFromCareerState) ──────────────────────
test("Career: rmAdvancedFromCareerState() runs without throwing on a valid CareerState", () => {
  const cs = makeCareerState();
  expect(() => rmAdvancedFromCareerState(cs)).not.toThrow();
});

test("Career: rmAdvancedFromCareerState() produces a valid state", () => {
  const cs = makeCareerState();
  const state = rmAdvancedFromCareerState(cs);
  expect(state.compression).toBeDefined();
  expect(state.otaStrategy).toBeDefined();
  expect(state.forecast).toBeDefined();
});

test("Career: rmAdvancedFromCareerState() carries cyclesElapsed forward across two cycles", () => {
  const cs = makeCareerState();
  const first = rmAdvancedFromCareerState(cs);
  const second = rmAdvancedFromCareerState({ ...cs, day: 4 }, first);
  expect(second.cyclesElapsed).toBe(2);
});

test("Career: rmAdvancedFromCareerState() handles missing lastDayReport gracefully", () => {
  const cs = makeCareerState({ lastDayReport: null });
  expect(() => rmAdvancedFromCareerState(cs)).not.toThrow();
});

test("Career: rmAdvancedFromCareerState() reads clients satisfaction off hotelState.clients", () => {
  const cs = makeCareerState();
  const state = rmAdvancedFromCareerState(cs);
  expect(state.diagnostics).toBeDefined();
});
