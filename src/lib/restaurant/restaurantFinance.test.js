import { computeRestaurantFinanceSummary } from "./restaurantFinance";

test("computes menu revenue/cost/margin from price*sales and cost*sales", () => {
  const state = { menu: [{ price: 10, cost: 4, sales: 5 }], staff: [], finance: {} };
  const summary = computeRestaurantFinanceSummary(state);
  expect(summary.menuRevenue).toBe(50);
  expect(summary.menuCost).toBe(20);
  expect(summary.grossMargin).toBe(30);
});

test("subtracts payroll, fixed costs and rent from gross margin for estimatedProfit", () => {
  const state = {
    menu: [{ price: 10, cost: 4, sales: 10 }],
    staff: [{ salary: 20 }],
    finance: { fixedCosts: 10, rent: 5 },
  };
  const summary = computeRestaurantFinanceSummary(state);
  // grossMargin = 60, minus payroll 20, fixedCosts 10, rent 5 = 25
  expect(summary.estimatedProfit).toBe(25);
});

test("avgTicket is the mean menu price, 0 for an empty menu", () => {
  expect(computeRestaurantFinanceSummary({ menu: [], staff: [], finance: {} }).avgTicket).toBe(0);
  expect(computeRestaurantFinanceSummary({ menu: [{ price: 10 }, { price: 20 }], staff: [], finance: {} }).avgTicket).toBe(15);
});

test("never throws on missing/malformed state", () => {
  expect(() => computeRestaurantFinanceSummary({})).not.toThrow();
  expect(() => computeRestaurantFinanceSummary(null)).not.toThrow();
});
