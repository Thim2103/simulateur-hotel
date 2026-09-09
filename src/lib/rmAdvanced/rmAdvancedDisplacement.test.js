import { computeDisplacement } from "./rmAdvancedDisplacement";

test("returns zero loss when there are no high-compression dates", () => {
  const result = computeDisplacement({ reservations: [], compression: { highCompressionDates: [] } });
  expect(result).toEqual({ bySegment: {}, totalLoss: 0, worstDates: [] });
});

test("computes displacement loss between segments on a high-compression date", () => {
  const reservations = [
    { status: "confirmed", arrival: "2026-09-16", departure: "2026-09-17", segment: "corporate", price: 200 },
    { status: "confirmed", arrival: "2026-09-16", departure: "2026-09-17", segment: "ota", price: 100 },
  ];
  const result = computeDisplacement({ reservations, compression: { highCompressionDates: ["2026-09-16"] } });

  // OTA (100) displaced from the corporate rate (200): loss = 100.
  expect(result.bySegment.ota).toBe(100);
  expect(result.bySegment.corporate).toBeUndefined();
  expect(result.totalLoss).toBe(100);
  expect(result.worstDates[0]).toEqual({ date: "2026-09-16", loss: 100 });
});

test("ignores dates with no active reservations", () => {
  const result = computeDisplacement({ reservations: [], compression: { highCompressionDates: ["2026-09-16"] } });
  expect(result.totalLoss).toBe(0);
});

test("no loss when all segments on a date share the same ADR", () => {
  const reservations = [
    { status: "confirmed", arrival: "2026-09-16", departure: "2026-09-17", segment: "leisure", price: 150 },
    { status: "confirmed", arrival: "2026-09-16", departure: "2026-09-17", segment: "corporate", price: 150 },
  ];
  const result = computeDisplacement({ reservations, compression: { highCompressionDates: ["2026-09-16"] } });
  expect(result.totalLoss).toBe(0);
});
