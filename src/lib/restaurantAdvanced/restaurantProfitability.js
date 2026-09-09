// Per-dish profitability -- gross margin per item, plus the menu's own
// gross/net margin (net = gross minus a fixed operating-cost share,
// eased by the "repositionner les prix" action bonus).
import { safeArray, safeNumber } from "../safe";

// A rough, deliberately simple estimate of non-food operating costs
// (staff, energy, rent share) as a percentage of F&B revenue -- net
// margin is gross margin minus this, so a menu can be "profitable" on
// paper (good gross margin) yet not actually profitable once it's run.
const OPERATING_COST_SHARE = 0.28;

// options:
//   menu: the restaurant's menu array.
//   pricingBonus: 0-100 boost from the "repositionner les prix" action --
//     nudges the reported margins up, never rewrites `price` itself.
export function computeProfitability({ menu = [], pricingBonus = 0 } = {}) {
  const items = safeArray(menu, []);
  if (!items.length) return { items: [], grossMargin: null, netMargin: null, topMargin: [], bottomMargin: [] };

  const scored = items.map((item) => {
    const price = safeNumber(item.price, 0);
    const cost = safeNumber(item.cost, 0);
    const margin = price - cost;
    const marginPct = price > 0 ? Math.round((margin / price) * 1000) / 10 : 0;
    return { id: item.id, name: item.name, category: item.category, margin: Math.round(margin * 100) / 100, marginPct };
  });

  const totalRevenue = items.reduce((sum, item) => sum + safeNumber(item.price, 0) * safeNumber(item.sales, 0), 0);
  const totalMargin = items.reduce(
    (sum, item) => sum + (safeNumber(item.price, 0) - safeNumber(item.cost, 0)) * safeNumber(item.sales, 0),
    0
  );
  const bonus = safeNumber(pricingBonus, 0) * 0.1;
  const grossMargin = totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 1000) / 10 + Math.round(bonus * 10) / 10 : null;
  const netMargin = grossMargin !== null ? Math.round((grossMargin - OPERATING_COST_SHARE * 100) * 10) / 10 : null;

  const sorted = [...scored].sort((a, b) => b.marginPct - a.marginPct);

  return {
    items: scored,
    grossMargin,
    netMargin,
    topMargin: sorted.slice(0, 3),
    bottomMargin: sorted.slice(-3).reverse(),
  };
}
