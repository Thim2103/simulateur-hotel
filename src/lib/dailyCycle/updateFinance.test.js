import { updateFinance } from "./updateFinance";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z"); // September -> "sep"

test("adds today's revenue/expenses onto the last month bucket of each finance object", () => {
  const result = updateFinance({
    hotelState: { finance: { revenue: [1000, 2000], costs: [500, 800], months: {} } },
    restaurantState: { finance: { revenue: [300], costs: [150], months: {} } },
    hotelRevenue: 400,
    restaurantRevenue: 100,
    expenses: 250,
    referenceDate: REFERENCE_DATE,
  });

  expect(result.hotelFinance.revenue).toEqual([1000, 2400]);
  expect(result.restaurantFinance.revenue).toEqual([400]);
});

test("splits the combined expenses proportionally to each side's revenue share", () => {
  const result = updateFinance({
    hotelState: { finance: { revenue: [0], costs: [0], months: {} } },
    restaurantState: { finance: { revenue: [0], costs: [0], months: {} } },
    hotelRevenue: 300, // 75% of today's revenue
    restaurantRevenue: 100, // 25%
    expenses: 200,
    referenceDate: REFERENCE_DATE,
  });

  expect(result.hotelFinance.costs).toEqual([150]);
  expect(result.restaurantFinance.costs).toEqual([50]);
});

test("also accumulates the current month's bucket in finance.months", () => {
  const result = updateFinance({
    hotelState: { finance: { revenue: [0], costs: [0], months: { sep: 500 } } },
    restaurantState: { finance: { revenue: [0], costs: [0], months: {} } },
    hotelRevenue: 400,
    restaurantRevenue: 0,
    expenses: 0,
    referenceDate: REFERENCE_DATE,
  });

  expect(result.hotelFinance.months.sep).toBe(900);
});

test("initializes empty revenue/costs arrays instead of throwing", () => {
  const result = updateFinance({
    hotelState: { finance: {} },
    restaurantState: { finance: {} },
    hotelRevenue: 100,
    restaurantRevenue: 50,
    expenses: 30,
    referenceDate: REFERENCE_DATE,
  });

  expect(result.hotelFinance.revenue).toEqual([100]);
  expect(result.restaurantFinance.revenue).toEqual([50]);
});
