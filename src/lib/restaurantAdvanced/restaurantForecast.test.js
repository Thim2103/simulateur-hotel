import { generateRestaurantForecast } from "./restaurantForecast";

function state(overrides = {}) {
  return {
    foodCost: { overall: 30 },
    profitability: { grossMargin: 60 },
    popularity: { items: [{ id: 1, popularity: 70 }, { id: 2, popularity: 50 }] },
    ...overrides,
  };
}

test("generates a 30-day horizon with three scenarios", () => {
  const forecast = generateRestaurantForecast(state());
  expect(forecast.horizonDays).toBe(30);
  expect(Object.keys(forecast.scenarios)).toEqual(["optimiste", "realiste", "pessimiste"]);
  expect(forecast.scenarios.realiste.days).toHaveLength(30);
});

test("optimiste scenario lowers food cost and raises gross margin over time", () => {
  const forecast = generateRestaurantForecast(state());
  const { optimiste } = forecast.scenarios;
  expect(optimiste.endFoodCost).toBeLessThan(30);
  expect(optimiste.endGrossMargin).toBeGreaterThan(60);
});

test("pessimiste scenario raises food cost and lowers gross margin over time", () => {
  const forecast = generateRestaurantForecast(state());
  const { pessimiste } = forecast.scenarios;
  expect(pessimiste.endFoodCost).toBeGreaterThan(30);
  expect(pessimiste.endGrossMargin).toBeLessThan(60);
});

test("realiste scenario stays flat", () => {
  const forecast = generateRestaurantForecast(state());
  const { realiste } = forecast.scenarios;
  expect(realiste.endFoodCost).toBeCloseTo(30, 0);
  expect(realiste.endGrossMargin).toBeCloseTo(60, 0);
});

test("falls back to sensible defaults when the state is empty", () => {
  const forecast = generateRestaurantForecast({});
  expect(forecast.scenarios.realiste.avgFoodCost).toBeGreaterThan(0);
});
