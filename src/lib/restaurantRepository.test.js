import { buildFinanceState, normalizeFinanceMonths, normalizeTaxes } from "./restaurantRepository";

test("normalizes finance months objects to numeric jan-dec values", () => {
  expect(normalizeFinanceMonths({ Jan: "1200", mars: 300, December: null })).toEqual({
    jan: 1200,
    feb: 0,
    mar: 300,
    apr: 0,
    may: 0,
    jun: 0,
    jul: 0,
    aug: 0,
    sep: 0,
    oct: 0,
    nov: 0,
    dec: 0,
  });
});

test("normalizes finance months arrays by index and defaults invalid input", () => {
  expect(normalizeFinanceMonths([100, "200", "invalid"])).toMatchObject({ jan: 100, feb: 200, mar: 0 });
  expect(normalizeFinanceMonths(null)).toEqual({
    jan: 0,
    feb: 0,
    mar: 0,
    apr: 0,
    may: 0,
    jun: 0,
    jul: 0,
    aug: 0,
    sep: 0,
    oct: 0,
    nov: 0,
    dec: 0,
  });
});

describe("normalizeTaxes", () => {
  test("keeps a numeric value as a number", () => {
    expect(normalizeTaxes(15)).toBe(15);
    expect(normalizeTaxes("18")).toBe(18);
  });

  test("keeps an array value as an array of numbers", () => {
    expect(normalizeTaxes([10, "20", "invalid"])).toEqual([10, 20, 0]);
  });

  test("parses a JSON array string", () => {
    expect(normalizeTaxes("[5,10]")).toEqual([5, 10]);
  });

  test("falls back to the default for null/undefined/invalid input", () => {
    expect(normalizeTaxes(null, 20)).toBe(20);
    expect(normalizeTaxes(undefined, 20)).toBe(20);
    expect(normalizeTaxes("not-a-number", 20)).toBe(20);
    expect(normalizeTaxes(null)).toBe(0);
  });
});

describe("buildFinanceState", () => {
  test("returns fully-shaped defaults when Supabase returns no rows", () => {
    const result = buildFinanceState([]);
    expect(result).toEqual({
      day: null,
      months: normalizeFinanceMonths(null),
      revenue: [],
      costs: [],
      taxes: 0,
      waste: [],
      energy: [],
      energyCost: [],
      payroll: 0,
      fixedCosts: 0,
      rent: 0,
    });
  });

  test("returns the same fully-shaped defaults for null/undefined input", () => {
    expect(buildFinanceState(null)).toEqual(buildFinanceState([]));
    expect(buildFinanceState(undefined)).toEqual(buildFinanceState([]));
  });

  test("normalizes months to an object and taxes to a number for a well-formed row", () => {
    const result = buildFinanceState([
      { months: { jan: 1000 }, revenue: [1000, 2000], costs: [500], taxes: 20, payroll: 9800, fixed_costs: 6200, rent: 4600 },
    ]);
    expect(result.months).toMatchObject({ jan: 1000, feb: 0 });
    expect(result.taxes).toBe(20);
    expect(result.revenue).toEqual([1000, 2000]);
    expect(result.payroll).toBe(9800);
  });

  test("repairs a row with an array-shaped taxes column and a malformed months value", () => {
    const result = buildFinanceState([{ months: "invalid", taxes: [10, 15] }]);
    expect(result.months).toEqual(normalizeFinanceMonths(null));
    expect(result.taxes).toEqual([10, 15]);
  });

  test("never throws on an unexpected row shape (string, number, object instead of array)", () => {
    expect(() => buildFinanceState("not-an-array")).not.toThrow();
    expect(() => buildFinanceState(42)).not.toThrow();
    expect(buildFinanceState({ 0: { taxes: 12 } }).taxes).toBe(12);
  });
});