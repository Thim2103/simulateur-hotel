import { computeProfitability } from "./restaurantProfitability";

const menu = [
  { id: 1, name: "Burger", category: "Plat", cost: 4, price: 16, sales: 100 },
  { id: 2, name: "Salade", category: "Entrée", cost: 2, price: 10, sales: 50 },
  { id: 3, name: "Tiramisu", category: "Dessert", cost: 5, price: 8, sales: 20 },
];

test("returns nulls for an empty menu", () => {
  expect(computeProfitability({ menu: [] })).toEqual({ items: [], grossMargin: null, netMargin: null, topMargin: [], bottomMargin: [] });
});

test("computes per-item margin and margin %", () => {
  const result = computeProfitability({ menu });
  const burger = result.items.find((item) => item.id === 1);
  expect(burger.margin).toBe(12);
  expect(burger.marginPct).toBe(75);
});

test("computes gross margin as weighted % of revenue", () => {
  const result = computeProfitability({ menu });
  // totalRevenue = 2260, totalMargin = 1200+400+60 = 1660
  expect(result.grossMargin).toBeCloseTo((1660 / 2260) * 100, 0);
});

test("net margin is lower than gross margin", () => {
  const result = computeProfitability({ menu });
  expect(result.netMargin).toBeLessThan(result.grossMargin);
});

test("pricingBonus lifts the gross margin", () => {
  const base = computeProfitability({ menu }).grossMargin;
  const boosted = computeProfitability({ menu, pricingBonus: 20 }).grossMargin;
  expect(boosted).toBeGreaterThan(base);
});

test("topMargin and bottomMargin are sorted by margin %", () => {
  const result = computeProfitability({ menu });
  expect(result.topMargin[0].id).toBe(2); // Salade: 80% margin, the highest
  expect(result.bottomMargin[0].id).toBe(3); // Tiramisu: 37.5% margin, the lowest
});
