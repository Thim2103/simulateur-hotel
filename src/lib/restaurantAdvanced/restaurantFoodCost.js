// Dynamic food cost -- the % of menu revenue eaten by ingredient cost,
// overall and per category, plus a waste share (fed by ESG) and a
// volatility index (fed by a supplier-negotiation action bonus, see
// restaurantActions.js's `renegocier-fournisseurs`).
import { safeArray, safeNumber, safeObject } from "../safe";

// options:
//   menu: the restaurant's menu array (see restaurantState.js -- each
//     item has cost/price/sales/category).
//   wasteRate: 0-100 estimated food waste share (from ESG, or null).
//   volatilityBonus: 0-100 reduction applied by the "renegocier
//     fournisseurs" action (see restaurantActions.js) -- lowers the
//     reported volatility index, it never rewrites `cost` itself.
export function computeFoodCost({ menu = [], wasteRate = null, volatilityBonus = 0 } = {}) {
  const items = safeArray(menu, []);
  const totalRevenue = items.reduce((sum, item) => sum + safeNumber(item.price, 0) * safeNumber(item.sales, 0), 0);
  const totalCost = items.reduce((sum, item) => sum + safeNumber(item.cost, 0) * safeNumber(item.sales, 0), 0);
  const overall = totalRevenue > 0 ? Math.round((totalCost / totalRevenue) * 1000) / 10 : null;

  const byCategoryTotals = {};
  items.forEach((item) => {
    const category = item.category || "Autre";
    const revenue = safeNumber(item.price, 0) * safeNumber(item.sales, 0);
    const cost = safeNumber(item.cost, 0) * safeNumber(item.sales, 0);
    const entry = byCategoryTotals[category] || { revenue: 0, cost: 0 };
    entry.revenue += revenue;
    entry.cost += cost;
    byCategoryTotals[category] = entry;
  });
  const byCategory = Object.fromEntries(
    Object.entries(byCategoryTotals).map(([category, totals]) => [
      category,
      totals.revenue > 0 ? Math.round((totals.cost / totals.revenue) * 1000) / 10 : null,
    ])
  );

  const wastePct = wasteRate !== null && wasteRate !== undefined ? Math.round(safeNumber(wasteRate, 0)) : null;

  // Baseline volatility grows with the number of distinct categories
  // (more suppliers to track) and shrinks with the negotiation bonus.
  const categoryCount = Math.max(1, Object.keys(byCategoryTotals).length);
  const rawVolatility = Math.min(100, 10 + categoryCount * 3);
  const volatilityIndex = Math.max(0, Math.round(rawVolatility - safeNumber(volatilityBonus, 0)));

  return { overall, byCategory, wastePct, volatilityIndex };
}

// Items whose cost eats more than `threshold`% of their own price --
// the ones a food-cost review should flag first.
export function highFoodCostItems(menu, threshold = 35) {
  return safeArray(menu, [])
    .filter((item) => {
      const price = safeNumber(item.price, 0);
      if (price <= 0) return false;
      return (safeNumber(item.cost, 0) / price) * 100 > threshold;
    })
    .map((item) => safeObject(item));
}
