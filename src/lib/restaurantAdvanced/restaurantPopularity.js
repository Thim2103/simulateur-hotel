// Dish popularity -- a 0-100 score per menu item relative to the menu's
// own top seller, plus trend detection against the previous cycle
// (folds in the "campagne plats signature" action bonus, see
// restaurantActions.js, and the clients module's satisfaction/review
// signal when available).
import { safeArray, safeNumber } from "../safe";

// options:
//   menu: the restaurant's menu array.
//   previousPopularity: the previous cycle's `popularity.items` list
//     (see restaurantAdvancedState.js), used to detect trends.
//   popularityBonus: 0-100 boost from the "campagne plats signature"
//     action -- applied evenly, it never rewrites `sales` itself.
//   clientsSatisfaction: 0-100 clients-module satisfaction score, used
//     as a small uplift/penalty so a well-served dining room lifts every
//     dish's perceived popularity a little, and vice versa.
export function computePopularity({ menu = [], previousPopularity = [], popularityBonus = 0, clientsSatisfaction = null } = {}) {
  const items = safeArray(menu, []);
  if (!items.length) return { items: [], trending: [], declining: [] };

  const maxSales = Math.max(1, ...items.map((item) => safeNumber(item.sales, 0)));
  const satisfactionShift = clientsSatisfaction !== null ? Math.round((safeNumber(clientsSatisfaction, 65) - 65) / 5) : 0;
  const previousById = new Map(safeArray(previousPopularity, []).map((entry) => [String(entry.id), entry]));

  const scored = items.map((item) => {
    const relative = (safeNumber(item.sales, 0) / maxSales) * 100;
    const score = Math.max(0, Math.min(100, Math.round(relative + safeNumber(popularityBonus, 0) + satisfactionShift)));
    const previous = previousById.get(String(item.id));
    const delta = previous ? score - safeNumber(previous.popularity, score) : 0;
    const trend = delta > 5 ? "up" : delta < -5 ? "down" : "stable";
    return { id: item.id, name: item.name, category: item.category, popularity: score, trend };
  });

  return {
    items: scored,
    trending: scored.filter((entry) => entry.trend === "up").map((entry) => entry.id),
    declining: scored.filter((entry) => entry.trend === "down").map((entry) => entry.id),
  };
}
