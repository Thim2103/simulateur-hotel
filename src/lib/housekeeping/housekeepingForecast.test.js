import { generateHousekeepingForecast } from "./housekeepingForecast";

const BASE_STATE = { overload: 90, quality: 65, workload: { roomsToClean: 6 } };

test("generates 30-day projections for all three scenarios", () => {
  const forecast = generateHousekeepingForecast(BASE_STATE);
  expect(forecast.horizonDays).toBe(30);
  expect(Object.keys(forecast.scenarios).sort()).toEqual(["optimiste", "pessimiste", "realiste"]);
  Object.values(forecast.scenarios).forEach((scenario) => {
    expect(scenario.days).toHaveLength(30);
    scenario.days.forEach((day) => {
      expect(day.overload).toBeGreaterThanOrEqual(0);
      expect(day.quality).toBeGreaterThanOrEqual(0);
      expect(day.quality).toBeLessThanOrEqual(100);
    });
  });
});

test("optimiste ends with lower overload and a higher quality than pessimiste", () => {
  const forecast = generateHousekeepingForecast(BASE_STATE);
  expect(forecast.scenarios.optimiste.endOverload).toBeLessThan(forecast.scenarios.pessimiste.endOverload);
  expect(forecast.scenarios.optimiste.endQuality).toBeGreaterThan(forecast.scenarios.pessimiste.endQuality);
});

test("honors a custom horizon", () => {
  const forecast = generateHousekeepingForecast(BASE_STATE, { horizonDays: 7 });
  expect(forecast.horizonDays).toBe(7);
  expect(forecast.scenarios.realiste.days).toHaveLength(7);
});

test("safe on empty/missing state", () => {
  expect(() => generateHousekeepingForecast(null)).not.toThrow();
  expect(() => generateHousekeepingForecast(undefined)).not.toThrow();
});
