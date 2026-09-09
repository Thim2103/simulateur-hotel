import { computePopularity } from "./restaurantPopularity";

const menu = [
  { id: 1, name: "Burger", category: "Plat", sales: 100 },
  { id: 2, name: "Salade", category: "Entrée", sales: 20 },
];

test("returns an empty result for an empty menu", () => {
  expect(computePopularity({ menu: [] })).toEqual({ items: [], trending: [], declining: [] });
});

test("scores the top seller at 100", () => {
  const result = computePopularity({ menu });
  const burger = result.items.find((item) => item.id === 1);
  expect(burger.popularity).toBe(100);
});

test("popularityBonus lifts every item's score", () => {
  const base = computePopularity({ menu }).items.find((item) => item.id === 2).popularity;
  const boosted = computePopularity({ menu, popularityBonus: 20 }).items.find((item) => item.id === 2).popularity;
  expect(boosted).toBeGreaterThan(base);
});

test("detects an upward trend against the previous cycle", () => {
  const previous = [{ id: 1, popularity: 50 }];
  const result = computePopularity({ menu, previousPopularity: previous });
  expect(result.items.find((item) => item.id === 1).trend).toBe("up");
  expect(result.trending).toContain(1);
});

test("detects a downward trend against the previous cycle", () => {
  const previous = [{ id: 2, popularity: 90 }];
  const result = computePopularity({ menu, previousPopularity: previous });
  expect(result.items.find((item) => item.id === 2).trend).toBe("down");
  expect(result.declining).toContain(2);
});

test("clientsSatisfaction shifts the score up or down", () => {
  const happy = computePopularity({ menu, clientsSatisfaction: 90 }).items.find((item) => item.id === 2).popularity;
  const unhappy = computePopularity({ menu, clientsSatisfaction: 20 }).items.find((item) => item.id === 2).popularity;
  expect(happy).toBeGreaterThan(unhappy);
});
