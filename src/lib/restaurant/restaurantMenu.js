// Menu-level metrics: popularity, best/worst sellers, average ticket. Pure
// functions over a menu array (see restaurantRepository.js's shape).
import { safeArray, safeNumber } from "../safe";

export function computeMenuPopularity(menu) {
  const items = safeArray(menu, []);
  if (!items.length) return 0;

  const totalSales = items.reduce((sum, item) => sum + safeNumber(item.sales, 0), 0);
  const lossLeaders = items.filter((item) => safeNumber(item.cost, 0) > safeNumber(item.price, 0)).length;

  return Math.round(Math.min(99, Math.max(40, 60 + totalSales / 3 - lossLeaders * 10)));
}

export function topPerformers(menu, count = 3) {
  return [...safeArray(menu, [])]
    .sort((a, b) => safeNumber(b.sales, 0) - safeNumber(a.sales, 0))
    .slice(0, count);
}

// Items losing money per sale (cost > price) or that never sell -- exactly
// what a menu review should flag first.
export function underperformers(menu) {
  return safeArray(menu, []).filter(
    (item) => safeNumber(item.cost, 0) > safeNumber(item.price, 0) || safeNumber(item.sales, 0) <= 0
  );
}

export function averageTicket(menu) {
  const items = safeArray(menu, []);
  if (!items.length) return 0;
  return Number((items.reduce((sum, item) => sum + safeNumber(item.price, 0), 0) / items.length).toFixed(2));
}
