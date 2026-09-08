import { generateFinancialForecast } from "./financeForecast";

function financeState(overrides = {}) {
  return {
    incomeStatement: { revenues: { total: 30000 }, expenses: { total: 20000 } },
    cash: 50000,
    ...overrides,
  };
}

test("produces a 30-day forecast with three scenarios", () => {
  const forecast = generateFinancialForecast(financeState());
  expect(forecast.horizonDays).toBe(30);
  expect(Object.keys(forecast.scenarios)).toEqual(["optimiste", "realiste", "pessimiste"]);
  expect(forecast.scenarios.realiste.days).toHaveLength(30);
});

test("the optimistic scenario ends with more cash than the pessimistic one", () => {
  const forecast = generateFinancialForecast(financeState());
  expect(forecast.scenarios.optimiste.closingCash).toBeGreaterThan(forecast.scenarios.pessimiste.closingCash);
});

test("the realistic scenario keeps a roughly flat daily run-rate", () => {
  const forecast = generateFinancialForecast(financeState());
  const firstDay = forecast.scenarios.realiste.days[0];
  const lastDay = forecast.scenarios.realiste.days[29];
  expect(Math.abs(lastDay.revenue - firstDay.revenue)).toBeLessThan(firstDay.revenue * 0.05);
});

test("cash never goes negative even in the pessimistic scenario", () => {
  const forecast = generateFinancialForecast(financeState({ incomeStatement: { revenues: { total: 3000 }, expenses: { total: 20000 } }, cash: 1000 }));
  forecast.scenarios.pessimiste.days.forEach((day) => {
    expect(day.cash).toBeGreaterThanOrEqual(0);
  });
});

test("respects a custom horizon", () => {
  const forecast = generateFinancialForecast(financeState(), { horizonDays: 7 });
  expect(forecast.horizonDays).toBe(7);
  expect(forecast.scenarios.realiste.days).toHaveLength(7);
});

test("never throws on missing input", () => {
  expect(() => generateFinancialForecast({})).not.toThrow();
});
