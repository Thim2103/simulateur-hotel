import { generateRmAdvancedForecast } from "./rmAdvancedForecast";

function state(overrides = {}) {
  return {
    compression: { avgCompression: 60 },
    otaStrategy: { directShare: 40, netAdrByChannel: { direct: 100, ota: 80 } },
    ...overrides,
  };
}

test("generates a 30-day horizon with optimiste/base/pessimiste scenarios", () => {
  const forecast = generateRmAdvancedForecast(state());
  expect(forecast.horizonDays).toBe(30);
  expect(Object.keys(forecast.scenarios)).toEqual(["optimiste", "base", "pessimiste"]);
  expect(forecast.scenarios.base.days).toHaveLength(30);
});

test("optimiste scenario raises compression and direct share over time", () => {
  const { optimiste } = generateRmAdvancedForecast(state()).scenarios;
  expect(optimiste.endCompression).toBeGreaterThan(60);
  expect(optimiste.endDirectShare).toBeGreaterThan(40);
});

test("pessimiste scenario lowers compression and direct share over time", () => {
  const { pessimiste } = generateRmAdvancedForecast(state()).scenarios;
  expect(pessimiste.endCompression).toBeLessThan(60);
  expect(pessimiste.endDirectShare).toBeLessThan(40);
});

test("base scenario stays flat", () => {
  const { base } = generateRmAdvancedForecast(state()).scenarios;
  expect(base.endCompression).toBeCloseTo(60, 0);
  expect(base.endDirectShare).toBeCloseTo(40, 0);
});

test("falls back to sensible defaults when the state is empty", () => {
  const forecast = generateRmAdvancedForecast({});
  expect(forecast.scenarios.base.avgCompression).toBeGreaterThan(0);
});
