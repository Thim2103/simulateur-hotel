import { generateStaffForecast } from "./staffForecast";

const BASE_STATE = { overload: 80, morale: 65, headcount: { total: 10 } };

test("generates 30-day projections for all three scenarios", () => {
  const forecast = generateStaffForecast(BASE_STATE);
  expect(forecast.horizonDays).toBe(30);
  expect(Object.keys(forecast.scenarios).sort()).toEqual(["optimiste", "pessimiste", "realiste"]);
  Object.values(forecast.scenarios).forEach((scenario) => {
    expect(scenario.days).toHaveLength(30);
    scenario.days.forEach((day) => {
      expect(day.morale).toBeGreaterThanOrEqual(0);
      expect(day.morale).toBeLessThanOrEqual(100);
      expect(day.absenteeism).toBeGreaterThanOrEqual(0);
      expect(day.overload).toBeGreaterThanOrEqual(0);
    });
  });
});

test("optimiste ends with lower overload than pessimiste", () => {
  const forecast = generateStaffForecast(BASE_STATE);
  expect(forecast.scenarios.optimiste.endOverload).toBeLessThan(forecast.scenarios.pessimiste.endOverload);
});

test("pessimiste degrades morale more than optimiste over the horizon", () => {
  const forecast = generateStaffForecast(BASE_STATE);
  expect(forecast.scenarios.pessimiste.avgMorale).toBeLessThanOrEqual(forecast.scenarios.optimiste.avgMorale);
});

test("honors a custom horizon", () => {
  const forecast = generateStaffForecast(BASE_STATE, { horizonDays: 7 });
  expect(forecast.horizonDays).toBe(7);
  expect(forecast.scenarios.realiste.days).toHaveLength(7);
});

test("safe on empty/missing state", () => {
  expect(() => generateStaffForecast(null)).not.toThrow();
  expect(() => generateStaffForecast(undefined)).not.toThrow();
});
