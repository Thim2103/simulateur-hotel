import { runRmAdvancedCycle, generateRmAdvancedReport, rmAdvancedDiagnosticsToAnalytics } from "./rmAdvancedEngine";

const rooms = [{ id: "r1" }, { id: "r2" }, { id: "r3" }, { id: "r4" }];
const reservations = [
  { room_id: "r1", status: "confirmed", arrival: "2026-09-16", departure: "2026-09-18", segment: "corporate", channel: "direct", price: 180, created_at: "2026-08-20" },
  { room_id: "r2", status: "confirmed", arrival: "2026-09-16", departure: "2026-09-17", segment: "ota", channel: "ota", price: 110, created_at: "2026-09-14" },
  { room_id: "r3", status: "confirmed", arrival: "2026-09-16", departure: "2026-09-17", segment: "leisure", channel: "agency", price: 130, created_at: "2026-09-01" },
];

function bundle(overrides = {}) {
  return { hotelState: {}, rooms, reservations, ...overrides };
}

const referenceDate = new Date("2026-09-16T00:00:00Z");

test("runs a first cycle and produces a full state", () => {
  const state = runRmAdvancedCycle({ hotelBundle: bundle(), referenceDate });
  expect(state.cyclesElapsed).toBe(1);
  expect(state.compression.avgCompression).toBeGreaterThanOrEqual(0);
  expect(state.otaStrategy.otaShare).not.toBeNull();
  expect(state.forecast).toBeDefined();
});

test("handles an empty PMS bundle without throwing", () => {
  expect(() => runRmAdvancedCycle({ hotelBundle: bundle({ rooms: [], reservations: [] }), referenceDate })).not.toThrow();
});

test("carries cyclesElapsed and replayLog forward across cycles", () => {
  const first = runRmAdvancedCycle({ hotelBundle: bundle(), referenceDate });
  const second = runRmAdvancedCycle({ hotelBundle: bundle(), previousState: first, referenceDate });
  expect(second.cyclesElapsed).toBe(2);
  expect(second.replayLog.entries).toHaveLength(2);
});

test("reduire-dependance-ota action feeds into the next cycle's OTA share", () => {
  const base = runRmAdvancedCycle({ hotelBundle: bundle(), referenceDate });
  const boosted = runRmAdvancedCycle({
    hotelBundle: bundle({ hotelState: { rmAdvanced: { directBookingBonus: 30 } } }),
    referenceDate,
  });
  expect(boosted.otaStrategy.otaShare).toBeLessThanOrEqual(base.otaStrategy.otaShare);
});

test("optimiser-mix-segments action reduces displacement loss", () => {
  const base = runRmAdvancedCycle({ hotelBundle: bundle(), referenceDate });
  const optimized = runRmAdvancedCycle({
    hotelBundle: bundle({ hotelState: { rmAdvanced: { mixOptimizationBonus: 40 } } }),
    referenceDate,
  });
  expect(optimized.displacement.totalLoss).toBeLessThanOrEqual(base.displacement.totalLoss);
});

test("restaurantDemand feeds into the premium special-pricing rate", () => {
  const low = runRmAdvancedCycle({ hotelBundle: bundle(), restaurantDemand: 20, referenceDate });
  const high = runRmAdvancedCycle({ hotelBundle: bundle(), restaurantDemand: 95, referenceDate });
  expect(high.specialPricing.premiumRate).toBeGreaterThanOrEqual(low.specialPricing.premiumRate);
});

test("staffOverload feeds into diagnostics", () => {
  const state = runRmAdvancedCycle({ hotelBundle: bundle(), staffOverload: 90, referenceDate });
  expect(state.diagnostics.some((d) => /surcharge/i.test(d.message))).toBe(true);
});

test("generateRmAdvancedReport assembles the full report shape", () => {
  const state = runRmAdvancedCycle({ hotelBundle: bundle(), referenceDate });
  const report = generateRmAdvancedReport(state);
  expect(report.compression).toBeDefined();
  expect(report.displacement).toBeDefined();
  expect(report.otaStrategy).toBeDefined();
  expect(report.replay.totalCycles).toBe(1);
});

test("rmAdvancedDiagnosticsToAnalytics adapts to the analytics diagnostics shape", () => {
  const state = runRmAdvancedCycle({ hotelBundle: bundle(), staffOverload: 90, referenceDate });
  const analyticsDiags = rmAdvancedDiagnosticsToAnalytics(state.diagnostics);
  expect(analyticsDiags.every((d) => "type" in d && "severity" in d && "message" in d && "cycleIndex" in d)).toBe(true);
});
