import { generateProForecast } from "./proForecast";

function state(overrides = {}) {
  return {
    score: { total: 60 },
    performanceHistory: [{ month: 5, score: 60, ebitdaMargin: 0.05 }],
    ...overrides,
  };
}

test("generates a 24-month horizon with three scenarios", () => {
  const forecast = generateProForecast(state());
  expect(forecast.horizonMonths).toBe(24);
  expect(Object.keys(forecast.scenarios)).toEqual(["optimiste", "realiste", "pessimiste"]);
  expect(forecast.scenarios.realiste.months).toHaveLength(24);
});

test("optimiste scenario ends above the starting score", () => {
  const { optimiste } = generateProForecast(state()).scenarios;
  expect(optimiste.endScore).toBeGreaterThan(60);
});

test("pessimiste scenario ends below the starting score", () => {
  const { pessimiste } = generateProForecast(state()).scenarios;
  expect(pessimiste.endScore).toBeLessThan(60);
});

test("realiste scenario stays close to the starting score", () => {
  const { realiste } = generateProForecast(state()).scenarios;
  expect(realiste.endScore).toBeCloseTo(60, 0);
});

test("falls back to sensible defaults when the state is empty", () => {
  const forecast = generateProForecast({});
  expect(forecast.scenarios.realiste.avgScore).toBeGreaterThan(0);
});
