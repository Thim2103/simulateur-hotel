// 30-day financial forecast, three scenarios (optimiste/réaliste/
// pessimiste) -- extrapolates from the current cycle's own daily run-rate
// (income statement ÷ 30) rather than re-simulating anything, the same
// "run-rate" approach lib/rm/forecast.js's forecastAdvanced() uses for
// revenue alone.
import { safeNumber, safeObject } from "../safe";

const HORIZON_DAYS = 30;
const SCENARIOS = {
  optimiste: 0.1,
  realiste: 0,
  pessimiste: -0.1,
};

function projectScenario({ dailyRevenue, dailyExpenses, openingCash, growthRate, horizonDays }) {
  const days = [];
  let cash = openingCash;
  let revenue = dailyRevenue;
  let expenses = dailyExpenses;
  const dailyGrowth = growthRate / horizonDays;

  for (let day = 1; day <= horizonDays; day += 1) {
    revenue = revenue * (1 + dailyGrowth);
    expenses = expenses * (1 + Math.max(0, dailyGrowth) * 0.5); // expenses grow slower than revenue either way
    const profit = revenue - expenses;
    cash = Math.max(0, cash + profit);
    days.push({ day, revenue: Math.round(revenue), expenses: Math.round(expenses), profit: Math.round(profit), cash: Math.round(cash) });
  }

  const totalRevenue = days.reduce((total, entry) => total + entry.revenue, 0);
  const totalExpenses = days.reduce((total, entry) => total + entry.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;

  return { days, totalRevenue: Math.round(totalRevenue), totalExpenses: Math.round(totalExpenses), totalProfit: Math.round(totalProfit), closingCash: Math.round(cash) };
}

// financeState: the current FinanceState (see financeState.js) -- reads
// incomeStatement (÷30 for a daily run-rate) and the current cash
// position as the forecast's starting point.
export function generateFinancialForecast(financeState, { horizonDays = HORIZON_DAYS } = {}) {
  const state = safeObject(financeState);
  const statement = safeObject(state.incomeStatement);
  const dailyRevenue = safeNumber(statement.revenues?.total, 0) / 30;
  const dailyExpenses = safeNumber(statement.expenses?.total, 0) / 30;
  const openingCash = safeNumber(state.cash, 0);

  const scenarios = Object.fromEntries(
    Object.entries(SCENARIOS).map(([name, growthRate]) => [
      name,
      projectScenario({ dailyRevenue, dailyExpenses, openingCash, growthRate, horizonDays }),
    ])
  );

  return { horizonDays, generatedAt: new Date().toISOString(), scenarios };
}
