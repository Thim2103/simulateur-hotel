// Daily restaurant revenue: menu.sales is already a per-day rate (see
// useRestaurantSimulator.js, which multiplies it by 30 for a monthly
// figure), so this operates directly on today's sales without prorating.
const DEFAULT_VAT_RATE = 20; // %, falls back to this if restaurant.finance.taxes is unusable

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizedTaxRate(taxes) {
  const rate = Array.isArray(taxes) ? Number(taxes[taxes.length - 1]) : Number(taxes);
  return Number.isFinite(rate) && rate >= 0 ? rate : DEFAULT_VAT_RATE;
}

// Calculates today's restaurant revenue from the menu's daily sales volume:
// gross sales, food/drink cost, gross margin, and VAT collected on top.
export function calculateRestaurantRevenue({ menu = [], finance = {}, referenceDate = new Date() } = {}) {
  const items = safeArray(menu);

  const grossRevenue = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.sales || 0), 0);
  const cost = items.reduce((sum, item) => sum + Number(item.cost || 0) * Number(item.sales || 0), 0);
  const margin = grossRevenue - cost;
  const vatRate = normalizedTaxRate(finance.taxes);
  const vat = grossRevenue * (vatRate / 100);
  const netRevenue = grossRevenue - vat;

  return {
    date: String(referenceDate.toISOString ? referenceDate.toISOString() : referenceDate).slice(0, 10),
    grossRevenue: Math.round(grossRevenue),
    cost: Math.round(cost),
    margin: Math.round(margin),
    vatRate,
    vat: Math.round(vat),
    netRevenue: Math.round(netRevenue),
  };
}
