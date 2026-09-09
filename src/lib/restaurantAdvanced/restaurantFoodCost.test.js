import { computeFoodCost, highFoodCostItems } from "./restaurantFoodCost";

const menu = [
  { id: 1, name: "Burger", category: "Plat", cost: 4, price: 16, sales: 100 },
  { id: 2, name: "Salade", category: "Entrée", cost: 2, price: 10, sales: 50 },
  { id: 3, name: "Tiramisu", category: "Dessert", cost: 5, price: 8, sales: 20 },
];

test("returns null overall when the menu is empty", () => {
  expect(computeFoodCost({ menu: [] }).overall).toBeNull();
});

test("computes overall food cost as weighted % of revenue", () => {
  const result = computeFoodCost({ menu });
  // totalRevenue = 16*100 + 10*50 + 8*20 = 2260, totalCost = 4*100+2*50+5*20 = 600
  expect(result.overall).toBeCloseTo((600 / 2260) * 100, 1);
});

test("computes food cost per category", () => {
  const result = computeFoodCost({ menu });
  expect(result.byCategory.Plat).toBeCloseTo((400 / 1600) * 100, 1);
  expect(result.byCategory.Dessert).toBeCloseTo((100 / 160) * 100, 1);
});

test("wastePct reflects the provided waste rate", () => {
  expect(computeFoodCost({ menu, wasteRate: 42 }).wastePct).toBe(42);
  expect(computeFoodCost({ menu, wasteRate: null }).wastePct).toBeNull();
});

test("volatilityBonus lowers the reported volatility index", () => {
  const base = computeFoodCost({ menu });
  const negotiated = computeFoodCost({ menu, volatilityBonus: 15 });
  expect(negotiated.volatilityIndex).toBeLessThan(base.volatilityIndex);
});

test("highFoodCostItems flags items above the threshold", () => {
  // Tiramisu: 5/8 = 62.5% > 35%
  const flagged = highFoodCostItems(menu, 35);
  expect(flagged.map((item) => item.name)).toEqual(["Tiramisu"]);
});
