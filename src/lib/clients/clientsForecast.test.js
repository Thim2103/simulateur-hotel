import { generateClientsForecast } from "./clientsForecast";

const STATE = {
  satisfaction: 68,
  loyalty: 55,
  reviews: { avgRating: 3.8, count: 30, positive: 74, negative: 12, trend: "stable" },
  behaviors: { avgSpend: 180, returnRate: 42, preferredSegment: "leisure" },
};

test("returns three scenarios", () => {
  const forecast = generateClientsForecast(STATE);
  expect(Object.keys(forecast.scenarios)).toEqual(expect.arrayContaining(["optimiste", "realiste", "pessimiste"]));
});

test("each scenario has horizonDays entries", () => {
  const forecast = generateClientsForecast(STATE);
  expect(forecast.scenarios.realiste.days).toHaveLength(30);
});

test("optimiste ends with higher satisfaction than pessimiste", () => {
  const forecast = generateClientsForecast(STATE);
  expect(forecast.scenarios.optimiste.endSatisfaction).toBeGreaterThan(forecast.scenarios.pessimiste.endSatisfaction);
});

test("realiste satisfaction stays close to current", () => {
  const forecast = generateClientsForecast(STATE);
  expect(Math.abs(forecast.scenarios.realiste.endSatisfaction - STATE.satisfaction)).toBeLessThan(3);
});

test("respects custom horizonDays", () => {
  const forecast = generateClientsForecast(STATE, { horizonDays: 14 });
  expect(forecast.horizonDays).toBe(14);
  expect(forecast.scenarios.realiste.days).toHaveLength(14);
});

test("returns valid structure when state is empty", () => {
  const forecast = generateClientsForecast({});
  expect(forecast.scenarios.realiste).toBeDefined();
  expect(forecast.scenarios.realiste.days).toHaveLength(30);
});
