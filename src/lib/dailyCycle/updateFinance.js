// Folds today's revenue/expenses into the hotel and restaurant finance
// objects: the last entry of the monthly revenue/costs arrays (same
// accumulation pattern as useHotelSimulator.js/useRestaurantSimulator.js's
// advanceSimulation()) and the current month's bucket in `finance.months`.
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function currentMonthKey(referenceDate) {
  return MONTH_KEYS[referenceDate.getMonth()] ?? MONTH_KEYS[0];
}

function accumulateFinance(finance = {}, { revenue, cost, maintenance = 0, referenceDate }) {
  const nextRevenue = safeArray(finance.revenue).map((value) => Number(value) || 0);
  const nextCosts = safeArray(finance.costs).map((value) => Number(value) || 0);
  if (!nextRevenue.length) nextRevenue.push(0);
  if (!nextCosts.length) nextCosts.push(0);

  nextRevenue[nextRevenue.length - 1] = Number((nextRevenue[nextRevenue.length - 1] + revenue).toFixed(2));
  nextCosts[nextCosts.length - 1] = Number((nextCosts[nextCosts.length - 1] + cost).toFixed(2));

  const monthKey = currentMonthKey(referenceDate);
  const months = { ...(finance.months && typeof finance.months === "object" && !Array.isArray(finance.months) ? finance.months : {}) };
  months[monthKey] = Number((Number(months[monthKey] || 0) + revenue).toFixed(2));

  const next = { ...finance, revenue: nextRevenue, costs: nextCosts, months };
  // The upkeep bill also gets its own line, aligned with `costs` (it is
  // part of those costs, not on top of them): the Finance page shows it as
  // "Entretien & Charges d'exploitation".
  if (maintenance > 0 || Array.isArray(finance.maintenance)) {
    const nextMaintenance = safeArray(finance.maintenance).map((value) => Number(value) || 0);
    while (nextMaintenance.length < nextCosts.length) nextMaintenance.push(0);
    nextMaintenance[nextCosts.length - 1] = Number((nextMaintenance[nextCosts.length - 1] + maintenance).toFixed(2));
    next.maintenance = nextMaintenance;
  }
  return next;
}

// hotelRevenue/restaurantRevenue/expenses: today's totals (see
// calculateHotelRevenue.js / calculateRestaurantRevenue.js /
// calculateExpenses.js). Splits `expenses.total` proportionally between the
// hotel and restaurant finance objects based on each department's share of
// today's revenue, so a single "expenses" figure still lands somewhere
// sensible in both monthly ledgers.
export function updateFinance({ hotelState = {}, restaurantState = {}, hotelRevenue = 0, restaurantRevenue = 0, expenses = 0, maintenance = 0, referenceDate = new Date() } = {}) {
  const totalRevenue = Math.max(1, hotelRevenue + restaurantRevenue);
  // The upkeep bill (`maintenance`, already inside `expenses`) is a hotel
  // cost: it goes entirely to the hotel's ledger, and only the rest is
  // split by revenue share.
  const hotelOnly = Math.max(0, Math.min(maintenance, expenses));
  const hotelExpenseShare = (expenses - hotelOnly) * (hotelRevenue / totalRevenue) + hotelOnly;
  const restaurantExpenseShare = expenses - hotelExpenseShare;

  const hotelFinance = accumulateFinance(hotelState.finance, { revenue: hotelRevenue, cost: hotelExpenseShare, maintenance: hotelOnly, referenceDate });
  const restaurantFinance = accumulateFinance(restaurantState.finance, { revenue: restaurantRevenue, cost: restaurantExpenseShare, referenceDate });

  return { hotelFinance, restaurantFinance };
}
