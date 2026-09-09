// Menu Engineering -- the classic hospitality-management matrix
// (Kasavana & Smith): each dish is scored on popularity (sales relative
// to the menu's own average) and profitability (margin relative to the
// menu's own average margin), then classified into one of four
// quadrants:
//   Stars       high popularity, high profitability -- protect & promote.
//   Plowhorses  high popularity, low profitability  -- re-cost or re-price.
//   Puzzles     low popularity, high profitability  -- reposition/promote.
//   Dogs        low popularity, low profitability   -- candidates to cut.
import { safeArray, safeNumber } from "../safe";

export function classifyMenuItem({ popularityIndex, profitabilityIndex }) {
  const highPopularity = popularityIndex >= 1;
  const highProfitability = profitabilityIndex >= 1;
  if (highPopularity && highProfitability) return "star";
  if (highPopularity && !highProfitability) return "plowhorse";
  if (!highPopularity && highProfitability) return "puzzle";
  return "dog";
}

// options:
//   menu: the restaurant's menu array.
export function computeMenuEngineering({ menu = [] } = {}) {
  const items = safeArray(menu, []);
  if (!items.length) return { items: [], counts: { stars: 0, plowhorses: 0, puzzles: 0, dogs: 0 } };

  const avgSales = items.reduce((sum, item) => sum + safeNumber(item.sales, 0), 0) / items.length || 1;
  const margins = items.map((item) => safeNumber(item.price, 0) - safeNumber(item.cost, 0));
  const avgMargin = margins.reduce((sum, value) => sum + value, 0) / items.length || 1;

  const classified = items.map((item, index) => {
    const popularityIndex = avgSales > 0 ? safeNumber(item.sales, 0) / avgSales : 0;
    const profitabilityIndex = avgMargin !== 0 ? margins[index] / avgMargin : 0;
    const category = classifyMenuItem({ popularityIndex, profitabilityIndex });
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      popularityIndex: Math.round(popularityIndex * 100) / 100,
      profitabilityIndex: Math.round(profitabilityIndex * 100) / 100,
      quadrant: category,
    };
  });

  const counts = classified.reduce(
    (acc, entry) => {
      acc[`${entry.quadrant}s`] = (acc[`${entry.quadrant}s`] || 0) + 1;
      return acc;
    },
    { stars: 0, plowhorses: 0, puzzles: 0, dogs: 0 }
  );

  return { items: classified, counts };
}
