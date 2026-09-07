import { calculateRestaurantRevenue } from "./calculateRestaurantRevenue";

test("computes gross revenue, cost and margin from today's menu sales", () => {
  const result = calculateRestaurantRevenue({
    menu: [
      { price: 20, cost: 8, sales: 10 },
      { price: 5, cost: 1.5, sales: 30 },
    ],
    finance: { taxes: 0 },
  });

  expect(result.grossRevenue).toBe(20 * 10 + 5 * 30);
  expect(result.cost).toBe(8 * 10 + 1.5 * 30);
  expect(result.margin).toBe(result.grossRevenue - result.cost);
});

test("applies the restaurant's own VAT rate", () => {
  const result = calculateRestaurantRevenue({ menu: [{ price: 100, cost: 40, sales: 1 }], finance: { taxes: 20 } });
  expect(result.vatRate).toBe(20);
  expect(result.vat).toBe(20);
  expect(result.netRevenue).toBe(80);
});

test("accepts a per-month tax array (legacy shape) by using the latest value", () => {
  const result = calculateRestaurantRevenue({ menu: [{ price: 100, cost: 40, sales: 1 }], finance: { taxes: [10, 15] } });
  expect(result.vatRate).toBe(15);
});

test("falls back to a default VAT rate for missing/invalid tax data", () => {
  const result = calculateRestaurantRevenue({ menu: [{ price: 100, cost: 40, sales: 1 }], finance: {} });
  expect(result.vatRate).toBe(20);
});

test("returns all zeros for an empty menu", () => {
  expect(calculateRestaurantRevenue({ menu: [], finance: {} })).toMatchObject({ grossRevenue: 0, cost: 0, margin: 0, vat: 0, netRevenue: 0 });
});
