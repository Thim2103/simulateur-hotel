import { computeMenuPopularity, topPerformers, underperformers, averageTicket } from "./restaurantMenu";

test("computeMenuPopularity is 0 for an empty menu", () => {
  expect(computeMenuPopularity([])).toBe(0);
});

test("computeMenuPopularity rewards total sales", () => {
  const lowSales = [{ name: "A", price: 10, cost: 5, sales: 2 }];
  const highSales = [{ name: "A", price: 10, cost: 5, sales: 40 }];
  expect(computeMenuPopularity(highSales)).toBeGreaterThan(computeMenuPopularity(lowSales));
});

test("computeMenuPopularity penalizes items sold at a loss", () => {
  const healthy = [{ name: "A", price: 10, cost: 5, sales: 10 }];
  const lossLeader = [{ name: "A", price: 5, cost: 10, sales: 10 }];
  expect(computeMenuPopularity(lossLeader)).toBeLessThan(computeMenuPopularity(healthy));
});

test("topPerformers returns the highest-selling items, capped at `count`", () => {
  const menu = [
    { name: "A", sales: 5 },
    { name: "B", sales: 30 },
    { name: "C", sales: 15 },
  ];
  expect(topPerformers(menu, 2).map((item) => item.name)).toEqual(["B", "C"]);
});

test("underperformers flags items sold at a loss or never sold", () => {
  const menu = [
    { name: "Healthy", price: 10, cost: 5, sales: 10 },
    { name: "LossLeader", price: 5, cost: 10, sales: 10 },
    { name: "NeverSold", price: 10, cost: 5, sales: 0 },
  ];
  expect(underperformers(menu).map((item) => item.name).sort()).toEqual(["LossLeader", "NeverSold"]);
});

test("averageTicket is 0 for an empty menu and the mean price otherwise", () => {
  expect(averageTicket([])).toBe(0);
  expect(averageTicket([{ price: 10 }, { price: 20 }])).toBe(15);
});
