import { generateMarketingForecast } from "./marketingForecast";

const BASE_STATE = { roi: { overallRoi: 1.5 }, conversion: { conversionRate: 10 }, reputation: 60 };

test("generates 30-day projections for all three scenarios", () => {
  const forecast = generateMarketingForecast(BASE_STATE);
  expect(forecast.horizonDays).toBe(30);
  expect(Object.keys(forecast.scenarios).sort()).toEqual(["optimiste", "pessimiste", "realiste"]);
  Object.values(forecast.scenarios).forEach((scenario) => {
    expect(scenario.days).toHaveLength(30);
    scenario.days.forEach((day) => {
      expect(day.roi).toBeGreaterThanOrEqual(0);
      expect(day.conversion).toBeGreaterThanOrEqual(0);
      expect(day.reputation).toBeGreaterThanOrEqual(0);
      expect(day.reputation).toBeLessThanOrEqual(100);
    });
  });
});

test("optimiste ends with a higher reputation than pessimiste", () => {
  const forecast = generateMarketingForecast(BASE_STATE);
  expect(forecast.scenarios.optimiste.endReputation).toBeGreaterThan(forecast.scenarios.pessimiste.endReputation);
});

test("optimiste has a higher average ROI than pessimiste", () => {
  const forecast = generateMarketingForecast(BASE_STATE);
  expect(forecast.scenarios.optimiste.avgRoi).toBeGreaterThan(forecast.scenarios.pessimiste.avgRoi);
});

test("honors a custom horizon", () => {
  const forecast = generateMarketingForecast(BASE_STATE, { horizonDays: 7 });
  expect(forecast.horizonDays).toBe(7);
  expect(forecast.scenarios.realiste.days).toHaveLength(7);
});

test("safe on empty/missing state", () => {
  expect(() => generateMarketingForecast(null)).not.toThrow();
  expect(() => generateMarketingForecast(undefined)).not.toThrow();
});
