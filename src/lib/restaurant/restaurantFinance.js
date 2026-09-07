// Read-only financial summary for the restaurant dashboard/report. Does not
// own restaurant_finance's persisted revenue/costs history -- that stays
// with lib/dailyCycle/updateFinance.js -- this only derives a same-cycle
// snapshot (menu margin, payroll, estimated profit) from the current state.
import { safeArray, safeNumber, safeObject } from "../safe";

export function computeRestaurantFinanceSummary(state) {
  const menu = safeArray(state?.menu, []);
  const finance = safeObject(state?.finance);
  const staff = safeArray(state?.staff, []);

  const menuRevenue = menu.reduce((sum, item) => sum + safeNumber(item.price, 0) * safeNumber(item.sales, 0), 0);
  const menuCost = menu.reduce((sum, item) => sum + safeNumber(item.cost, 0) * safeNumber(item.sales, 0), 0);
  const grossMargin = menuRevenue - menuCost;
  const payroll = staff.reduce((sum, person) => sum + safeNumber(person.salary, 0), 0);
  const estimatedProfit = grossMargin - payroll - safeNumber(finance.fixedCosts, 0) - safeNumber(finance.rent, 0);

  return {
    menuRevenue: Math.round(menuRevenue),
    menuCost: Math.round(menuCost),
    grossMargin: Math.round(grossMargin),
    payroll: Math.round(payroll),
    estimatedProfit: Math.round(estimatedProfit),
    avgTicket: menu.length ? Number((menu.reduce((sum, item) => sum + safeNumber(item.price, 0), 0) / menu.length).toFixed(2)) : 0,
  };
}
