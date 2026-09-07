import { normalizeFinanceMonths } from "./restaurantRepository";

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