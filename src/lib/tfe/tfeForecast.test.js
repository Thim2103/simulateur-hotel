import { generateTfeForecast } from "./tfeForecast";

const BASE_STATE = { score: { total: 55 }, performanceHistory: [{ month: 5, score: 55, ebitdaMargin: 0.05 }] };

test("generates 36-month projections for all three scenarios", () => {
  const forecast = generateTfeForecast(BASE_STATE);
  expect(forecast.horizonMonths).toBe(36);
  expect(Object.keys(forecast.scenarios).sort()).toEqual(["optimiste", "pessimiste", "realiste"]);
  Object.values(forecast.scenarios).forEach((scenario) => {
    expect(scenario.months).toHaveLength(36);
    scenario.months.forEach((month) => {
      expect(month.score).toBeGreaterThanOrEqual(0);
      expect(month.score).toBeLessThanOrEqual(100);
    });
  });
});

test("optimiste ends with a higher score than pessimiste", () => {
  const forecast = generateTfeForecast(BASE_STATE);
  expect(forecast.scenarios.optimiste.endScore).toBeGreaterThan(forecast.scenarios.pessimiste.endScore);
});

test("honors a custom horizon", () => {
  const forecast = generateTfeForecast(BASE_STATE, { horizonMonths: 6 });
  expect(forecast.horizonMonths).toBe(6);
  expect(forecast.scenarios.realiste.months).toHaveLength(6);
});

test("safe on empty/missing state", () => {
  expect(() => generateTfeForecast(null)).not.toThrow();
  expect(() => generateTfeForecast(undefined)).not.toThrow();
  expect(() => generateTfeForecast({})).not.toThrow();
});
