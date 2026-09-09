import { computeBehaviors } from "./clientsBehavior";

test("returns null avgSpend when no revenue or rooms", () => {
  const beh = computeBehaviors({ hotelBundle: { reservations: [] }, satisfaction: 70, loyalty: 60, segments: { business: 30, leisure: 40, famille: 20, premium: 10 } });
  expect(beh.avgSpend).toBeNull();
});

test("computes avgSpend from revenue and occupied rooms", () => {
  const bundle = {
    reservations: [
      { status: "occupied" },
      { status: "occupied" },
    ],
  };
  const beh = computeBehaviors({ hotelBundle: bundle, satisfaction: 70, loyalty: 60, dailyRevenue: 400, fbRevenue: 100 });
  expect(beh.avgSpend).toBe(250); // (400 + 100) / 2
});

test("returnRate is higher when loyalty is high", () => {
  const low = computeBehaviors({ satisfaction: 65, loyalty: 30 });
  const high = computeBehaviors({ satisfaction: 65, loyalty: 90 });
  expect(high.returnRate).toBeGreaterThan(low.returnRate);
});

test("returnRate is clamped between 0 and 100", () => {
  const beh = computeBehaviors({ satisfaction: 100, loyalty: 100 });
  expect(beh.returnRate).toBeLessThanOrEqual(100);
  expect(beh.returnRate).toBeGreaterThanOrEqual(0);
});

test("preferredSegment matches the dominant share", () => {
  const beh = computeBehaviors({ segments: { business: 10, leisure: 55, famille: 20, premium: 15 } });
  expect(beh.preferredSegment).toBe("leisure");
});

test("handles null inputs gracefully", () => {
  expect(() => computeBehaviors({})).not.toThrow();
  expect(() => computeBehaviors({ hotelBundle: null })).not.toThrow();
});
