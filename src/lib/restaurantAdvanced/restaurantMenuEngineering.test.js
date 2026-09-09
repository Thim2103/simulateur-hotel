import { computeMenuEngineering, classifyMenuItem } from "./restaurantMenuEngineering";

test("classifies a high-popularity, high-profitability item as a star", () => {
  expect(classifyMenuItem({ popularityIndex: 1.5, profitabilityIndex: 1.3 })).toBe("star");
});

test("classifies a high-popularity, low-profitability item as a plowhorse", () => {
  expect(classifyMenuItem({ popularityIndex: 1.5, profitabilityIndex: 0.5 })).toBe("plowhorse");
});

test("classifies a low-popularity, high-profitability item as a puzzle", () => {
  expect(classifyMenuItem({ popularityIndex: 0.5, profitabilityIndex: 1.5 })).toBe("puzzle");
});

test("classifies a low-popularity, low-profitability item as a dog", () => {
  expect(classifyMenuItem({ popularityIndex: 0.5, profitabilityIndex: 0.5 })).toBe("dog");
});

test("returns an empty result for an empty menu", () => {
  expect(computeMenuEngineering({ menu: [] })).toEqual({ items: [], counts: { stars: 0, plowhorses: 0, puzzles: 0, dogs: 0 } });
});

test("classifies a full menu and counts every quadrant", () => {
  const menu = [
    { id: 1, name: "Burger", sales: 200, cost: 4, price: 16 }, // high sales, high margin -> star
    { id: 2, name: "Soupe", sales: 200, cost: 8, price: 9 }, // high sales, low margin -> plowhorse
    { id: 3, name: "Foie gras", sales: 5, cost: 3, price: 20 }, // low sales, high margin -> puzzle
    { id: 4, name: "Compote", sales: 5, cost: 4, price: 5 }, // low sales, low margin -> dog
  ];
  const result = computeMenuEngineering({ menu });
  expect(result.items.find((item) => item.id === 1).quadrant).toBe("star");
  expect(result.items.find((item) => item.id === 2).quadrant).toBe("plowhorse");
  expect(result.items.find((item) => item.id === 3).quadrant).toBe("puzzle");
  expect(result.items.find((item) => item.id === 4).quadrant).toBe("dog");
  expect(result.counts).toEqual({ stars: 1, plowhorses: 1, puzzles: 1, dogs: 1 });
});
