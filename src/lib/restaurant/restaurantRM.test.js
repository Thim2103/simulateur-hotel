import { deriveDemandFromRM } from "./restaurantRM";

test("higher hotel occupancy produces a higher demand boost", () => {
  const low = deriveDemandFromRM({ hotelOccupancyPercent: 20 });
  const high = deriveDemandFromRM({ hotelOccupancyPercent: 90 });
  expect(high.demandBoost).toBeGreaterThan(low.demandBoost);
});

test("a strong 7-day forecast adds to the demand boost", () => {
  const noForecast = deriveDemandFromRM({ hotelOccupancyPercent: 50, rmReport: null });
  const strongForecast = deriveDemandFromRM({ hotelOccupancyPercent: 50, rmReport: { forecast: { next7: 4000 } } });
  expect(strongForecast.demandBoost).toBeGreaterThan(noForecast.demandBoost);
});

test("recommends breakfast/room-service focus when the hotel is nearly full", () => {
  const { recommendedFocus } = deriveDemandFromRM({ hotelOccupancyPercent: 85 });
  expect(recommendedFocus).toMatch(/petit-déjeuner|room-service/i);
});

test("recommends targeting outside customers when the hotel is nearly empty", () => {
  const { recommendedFocus } = deriveDemandFromRM({ hotelOccupancyPercent: 10 });
  expect(recommendedFocus).toMatch(/clientèle externe/i);
});

test("never throws on a missing/malformed rmReport", () => {
  expect(() => deriveDemandFromRM({})).not.toThrow();
  expect(() => deriveDemandFromRM({ rmReport: "not-an-object" })).not.toThrow();
});
