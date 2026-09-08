import { generateEsgForecast } from "./esgForecast";

const BASE_STATE = { energy: 300, water: 15, waste: 40, co2: 200, score: 55 };

test("generates 30-day projections for all three scenarios", () => {
  const forecast = generateEsgForecast(BASE_STATE);
  expect(forecast.horizonDays).toBe(30);
  expect(Object.keys(forecast.scenarios).sort()).toEqual(["optimiste", "pessimiste", "realiste"]);
  Object.values(forecast.scenarios).forEach((scenario) => {
    expect(scenario.days).toHaveLength(30);
    scenario.days.forEach((day) => {
      expect(day.energy).toBeGreaterThanOrEqual(0);
      expect(day.co2).toBeGreaterThanOrEqual(0);
      expect(day.score).toBeGreaterThanOrEqual(0);
      expect(day.score).toBeLessThanOrEqual(100);
    });
  });
});

test("optimiste ends with lower CO2 and a higher score than pessimiste", () => {
  const forecast = generateEsgForecast(BASE_STATE);
  expect(forecast.scenarios.optimiste.endCo2).toBeLessThan(forecast.scenarios.pessimiste.endCo2);
  expect(forecast.scenarios.optimiste.days[29].score).toBeGreaterThan(forecast.scenarios.pessimiste.days[29].score);
});

test("honors a custom horizon", () => {
  const forecast = generateEsgForecast(BASE_STATE, { horizonDays: 7 });
  expect(forecast.horizonDays).toBe(7);
  expect(forecast.scenarios.realiste.days).toHaveLength(7);
});

test("safe on empty/missing state", () => {
  expect(() => generateEsgForecast(null)).not.toThrow();
  expect(() => generateEsgForecast(undefined)).not.toThrow();
});
