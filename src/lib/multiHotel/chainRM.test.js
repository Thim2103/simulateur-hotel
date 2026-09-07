import { consolidateRM } from "./chainRM";

function result(id, { roomCount = 50, next7 = 100, next30 = 400, next90 = 1200, pickupDaily = {}, recommendedADR = 150 } = {}) {
  return {
    hotel: { id, hotelState: { structure: { roomCount } } },
    dailyReport: { rmReport: { forecast: { next7, next30, next90 }, pickup: { daily: pickupDaily }, pricing: { recommendedADR } } },
  };
}

test("sums the forecast across every hotel", () => {
  const rm = consolidateRM([result("a", { next7: 100, next30: 400, next90: 1200 }), result("b", { next7: 50, next30: 200, next90: 600 })]);
  expect(rm.consolidatedForecast).toEqual({ next7: 150, next30: 600, next90: 1800 });
});

test("merges each hotel's daily pickup counts by date", () => {
  const rm = consolidateRM([
    result("a", { pickupDaily: { "2026-09-01": 2, "2026-09-02": 1 } }),
    result("b", { pickupDaily: { "2026-09-01": 3 } }),
  ]);
  expect(rm.consolidatedPickup).toEqual({ "2026-09-01": 5, "2026-09-02": 1 });
});

test("weights the recommended ADR by each hotel's room count", () => {
  // a: 100 rooms @ 200; b: 0 rooms (should not count at all) @ 1000; result should be 200.
  const rm = consolidateRM([result("a", { roomCount: 100, recommendedADR: 200 }), result("b", { roomCount: 0, recommendedADR: 1000 })]);
  expect(rm.recommendedADR).toBe(200);
});

test("recommendedADR is 0 when every hotel has zero rooms", () => {
  expect(consolidateRM([result("a", { roomCount: 0 })]).recommendedADR).toBe(0);
});

test("returns zeroed-out results for an empty chain", () => {
  expect(consolidateRM([])).toEqual({ consolidatedForecast: { next7: 0, next30: 0, next90: 0 }, consolidatedPickup: {}, recommendedADR: 0 });
});

test("never throws with no argument at all", () => {
  expect(() => consolidateRM()).not.toThrow();
});
