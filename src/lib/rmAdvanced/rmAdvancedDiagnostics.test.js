import { generateRmAdvancedDiagnostics } from "./rmAdvancedDiagnostics";

function baseArgs(overrides = {}) {
  return {
    compression: { avgCompression: 60, highCompressionDates: [], lowOccupancyDates: [] },
    displacement: { totalLoss: 0 },
    pickupCurves: { momentum: 0 },
    otaStrategy: { otaShare: 30 },
    staffOverload: 40,
    esgScore: 60,
    clientsSatisfaction: 70,
    marketingReputation: 60,
    ...overrides,
  };
}

test("returns no diagnostics for a healthy RM cycle", () => {
  expect(generateRmAdvancedDiagnostics(baseArgs())).toEqual([]);
});

test("flags very high compression as an opportunity to raise ADR", () => {
  const diagnostics = generateRmAdvancedDiagnostics(baseArgs({ compression: { avgCompression: 95, highCompressionDates: [], lowOccupancyDates: [] } }));
  expect(diagnostics.some((d) => d.type === "opportunity" && /compression/i.test(d.message))).toBe(true);
});

test("flags several low-occupancy dates", () => {
  const diagnostics = generateRmAdvancedDiagnostics(baseArgs({ compression: { avgCompression: 60, highCompressionDates: [], lowOccupancyDates: ["a", "b", "c", "d"] } }));
  expect(diagnostics.some((d) => /sous-occupées/i.test(d.message))).toBe(true);
});

test("flags high displacement loss on high-compression dates", () => {
  const diagnostics = generateRmAdvancedDiagnostics(
    baseArgs({ compression: { avgCompression: 90, highCompressionDates: ["2026-09-16"], lowOccupancyDates: [] }, displacement: { totalLoss: 3000 } })
  );
  expect(diagnostics.some((d) => d.type === "error" && d.severity === "high" && /displacement/i.test(d.message))).toBe(true);
});

test("flags high OTA dependency", () => {
  const diagnostics = generateRmAdvancedDiagnostics(baseArgs({ otaStrategy: { otaShare: 70 } }));
  expect(diagnostics.some((d) => /OTA/.test(d.message))).toBe(true);
});

test("flags slowing pickup momentum", () => {
  const diagnostics = generateRmAdvancedDiagnostics(baseArgs({ pickupCurves: { momentum: -20 } }));
  expect(diagnostics.some((d) => /ralentissement/i.test(d.message))).toBe(true);
});

test("flags staff overload", () => {
  const diagnostics = generateRmAdvancedDiagnostics(baseArgs({ staffOverload: 85 }));
  expect(diagnostics.some((d) => /surcharge/i.test(d.message))).toBe(true);
});

test("flags a good ESG score as a premium direct-booking opportunity when OTA share is meaningful", () => {
  const diagnostics = generateRmAdvancedDiagnostics(baseArgs({ esgScore: 80, otaStrategy: { otaShare: 45 } }));
  expect(diagnostics.some((d) => d.type === "opportunity" && /ESG/i.test(d.message))).toBe(true);
});

test("flags low clients satisfaction combined with high compression", () => {
  const diagnostics = generateRmAdvancedDiagnostics(baseArgs({ clientsSatisfaction: 40, compression: { avgCompression: 80, highCompressionDates: [], lowOccupancyDates: [] } }));
  expect(diagnostics.some((d) => /prix perçu/i.test(d.message))).toBe(true);
});

test("flags low marketing reputation", () => {
  const diagnostics = generateRmAdvancedDiagnostics(baseArgs({ marketingReputation: 25 }));
  expect(diagnostics.some((d) => /réputation marketing/i.test(d.message))).toBe(true);
});
