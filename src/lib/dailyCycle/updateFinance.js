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

function accumulateFinance(finance = {}, { revenue, cost, referenceDate }) {
  const nextRevenue = safeArray(finance.revenue).map((value) => Number(value) || 0);
  const nextCosts = safeArray(finance.costs).map((value) => Number(value) || 0);
  if (!nextRevenue.length) nextRevenue.push(0);
  if (!nextCosts.length) nextCosts.push(0);

  nextRevenue[nextRevenue.length - 1] = Number((nextRevenue[nextRevenue.length - 1] + revenue).toFixed(2));
  nextCosts[nextCosts.length - 1] = Number((nextCosts[nextCosts.length - 1] + cost).toFixed(2));

  const monthKey = currentMonthKey(referenceDate);
  const months = { ...(finance.months && typeof finance.months === "object" && !Array.isArray(finance.months) ? finance.months : {}) };
  months[monthKey] = Number((Number(months[monthKey] || 0) + revenue).toFixed(2));

  return { ...finance, revenue: nextRevenue, costs: nextCosts, months };
}

// hotelRevenue/restaurantRevenue/expenses: today's totals (see
// calculateHotelRevenue.js / calculateRestaurantRevenue.js /
// calculateExpenses.js). Splits `expenses.total` proportionally between the
// hotel and restaurant finance objects based on each department's share of
// today's revenue, so a single "expenses" figure still lands somewhere
// sensible in both monthly ledgers.
export function updateFinance({ hotelState = {}, restaurantState = {}, hotelRevenue = 0, restaurantRevenue = 0, expenses = 0, referenceDate = new Date() } = {}) {
  const totalRevenue = Math.max(1, hotelRevenue + restaurantRevenue);
  const hotelExpenseShare = expenses * (hotelRevenue / totalRevenue);
  const restaurantExpenseShare = expenses - hotelExpenseShare;

  const hotelFinance = accumulateFinance(hotelState.finance, { revenue: hotelRevenue, cost: hotelExpenseShare, referenceDate });
  const restaurantFinance = accumulateFinance(restaurantState.finance, { revenue: restaurantRevenue, cost: restaurantExpenseShare, referenceDate });

  return { hotelFinance, restaurantFinance };
}
