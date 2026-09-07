import { consolidateFinance } from "./chainFinance";

function result(id, { hotelRevenue = 100, restaurantRevenue = 50, expenses = 80, profit = 70 } = {}) {
  return {
    hotel: { id, name: `Hotel ${id}` },
    dailyReport: {
      hotelRevenue: { netRevenue: hotelRevenue },
      restaurantRevenue: { netRevenue: restaurantRevenue },
      expenses: { total: expenses },
      profit,
    },
  };
}

test("sums revenue, expenses and profit across every hotel", () => {
  const finance = consolidateFinance([result("a", { profit: 70, expenses: 80 }), result("b", { profit: 30, expenses: 40 })]);
  expect(finance.totalProfit).toBe(100);
  expect(finance.totalExpenses).toBe(120);
});

test("totalRevenue combines each hotel's own hotel + restaurant revenue", () => {
  const finance = consolidateFinance([result("a", { hotelRevenue: 100, restaurantRevenue: 50 })]);
  expect(finance.totalRevenue).toBe(150);
});

test("includes a per-hotel breakdown with each hotel's own numbers", () => {
  const finance = consolidateFinance([result("a", { profit: 70 }), result("b", { profit: 30 })]);
  expect(finance.byHotel).toEqual([
    expect.objectContaining({ hotelId: "a", profit: 70 }),
    expect.objectContaining({ hotelId: "b", profit: 30 }),
  ]);
});

test("returns all zeros for an empty chain", () => {
  expect(consolidateFinance([])).toEqual({ totalRevenue: 0, totalExpenses: 0, totalProfit: 0, byHotel: [] });
});

test("never throws with no argument at all", () => {
  expect(() => consolidateFinance()).not.toThrow();
});
