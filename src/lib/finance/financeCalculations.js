// Pure financial calculations: income statement (compte de résultats),
// balance sheet (bilan), cash-flow statement, and the ratios hoteliers
// actually track (GOPPAR, RevPAR, payroll ratio, debt ratio, liquidity
// ratio). Operates on the same monthly hotelState.finance/
// restaurantState.finance figures useHotelSimulator.js/
// useRestaurantSimulator.js already compute kpis from (totalMonthlyRevenue
// /totalMonthlyCosts/payroll/fixedCosts) -- this module doesn't
// re-simulate revenue or expenses, it only adds the reporting layer the
// existing Finance.jsx page never had.
//
// Accounting model note: this is a simulator, not a real ledger -- there
// is no tracked history of actual cash movements, loans, or fixed-asset
// purchases anywhere else in the app. The balance sheet below is a
// deliberately simple, internally-consistent model (assets = liabilities
// + equity always holds by construction) seeded once and rolled forward
// by each cycle's net income/cash-flow, not a claim of real-world
// accounting precision.
import { safeNumber, safeObject } from "../safe";

const DAYS_PER_MONTH = 30;
const ASSET_VALUE_PER_ROOM = 15000; // €, a plausible fixed-asset value per room (land+building+FF&E)
const ANNUAL_DEPRECIATION_RATE = 0.05; // 5%/year, straight-line
const INITIAL_DEBT_RATIO = 0.4; // the hotel starts 40% leveraged against its fixed assets
const MONTHLY_DEBT_REPAYMENT_RATE = 0.01; // 1% of the remaining debt repaid per cycle
const RECEIVABLE_DAYS = 5; // revenue not yet collected (OTA/corporate billing delay)
const PAYABLE_DAYS = 15; // expenses not yet paid out
const DEFAULT_OPENING_CASH = 50000; // €, a plausible starting cash position

// 1. Compte de résultats: revenues, expenses, GOP (before fixed/overhead
// charges -- the standard hotel-accounting distinction), EBITDA (after
// them, before D&A/interest/tax), and net income.
export function computeIncomeStatement({ hotelFinance, restaurantFinance, roomCount = 0 } = {}) {
  const hotel = safeObject(hotelFinance);
  const restaurant = safeObject(restaurantFinance);

  const hotelRevenue = Math.round(safeNumber(sum(hotel.revenue), 0));
  const restaurantRevenue = Math.round(safeNumber(sum(restaurant.revenue), 0));
  const totalRevenue = hotelRevenue + restaurantRevenue;

  // Variable: whatever it cost to actually produce this revenue (the
  // "costs" arrays), before the fixed/overhead layer.
  const hotelVariable = Math.round(safeNumber(sum(hotel.costs), 0));
  const restaurantVariable = Math.round(safeNumber(sum(restaurant.costs), 0));
  const variableExpenses = hotelVariable + restaurantVariable;

  const payroll = Math.round(safeNumber(hotel.payroll, 0));
  const fixedCosts = Math.round(safeNumber(hotel.fixedCosts, 0) + safeNumber(restaurant.fixedCosts, 0) + safeNumber(restaurant.rent, 0));
  const fixedExpenses = payroll + fixedCosts;

  const totalExpenses = variableExpenses + fixedExpenses;

  const gop = totalRevenue - variableExpenses;
  const ebitda = gop - fixedExpenses; // = totalRevenue - totalExpenses
  const taxRate = normalizedTaxRate(hotel.taxes);
  const taxAmount = Math.max(0, Math.round(ebitda * (taxRate / 100)));
  const depreciation = Math.round(monthlyDepreciation(roomCount));
  const netIncome = ebitda - depreciation - taxAmount;

  return {
    revenues: { hotel: hotelRevenue, restaurant: restaurantRevenue, total: totalRevenue },
    expenses: { variable: variableExpenses, payroll, fixed: fixedCosts, total: totalExpenses },
    gop,
    ebitda,
    depreciation,
    taxRate,
    taxAmount,
    netIncome,
  };
}

function sum(values) {
  return (Array.isArray(values) ? values : []).reduce((total, value) => total + safeNumber(value, 0), 0);
}

function normalizedTaxRate(taxes) {
  const rate = Array.isArray(taxes) ? safeNumber(taxes[taxes.length - 1], 20) : safeNumber(taxes, 20);
  return rate >= 0 ? rate : 20;
}

function monthlyDepreciation(roomCount) {
  return roomCount * ASSET_VALUE_PER_ROOM * (ANNUAL_DEPRECIATION_RATE / 12);
}

// 2. Bilan: a simple, always-balanced model (see this file's header for
// why) rolled forward one cycle at a time from the previous balance
// sheet's cash/debt/fixed-assets, using this cycle's income statement.
export function computeBalanceSheet({ incomeStatement, roomCount = 0, cyclesElapsed = 0, previousCash = null } = {}) {
  const statement = safeObject(incomeStatement);
  const grossFixedAssets = roomCount * ASSET_VALUE_PER_ROOM;
  const accumulatedDepreciation = Math.min(grossFixedAssets, monthlyDepreciation(roomCount) * cyclesElapsed);
  const fixedAssets = Math.round(grossFixedAssets - accumulatedDepreciation);

  const initialDebt = grossFixedAssets * INITIAL_DEBT_RATIO;
  const debt = Math.max(0, Math.round(initialDebt * (1 - MONTHLY_DEBT_REPAYMENT_RATE) ** cyclesElapsed));
  const debtRepaymentThisCycle = Math.round(
    Math.max(0, initialDebt * (1 - MONTHLY_DEBT_REPAYMENT_RATE) ** Math.max(0, cyclesElapsed - 1) - debt)
  );

  const dailyRevenue = safeNumber(statement.revenues?.total, 0) / DAYS_PER_MONTH;
  const dailyExpenses = safeNumber(statement.expenses?.total, 0) / DAYS_PER_MONTH;
  const receivables = Math.round(dailyRevenue * RECEIVABLE_DAYS);
  const payables = Math.round(dailyExpenses * PAYABLE_DAYS);

  const openingCash = previousCash ?? DEFAULT_OPENING_CASH;
  const netIncome = safeNumber(statement.netIncome, 0);
  const depreciation = safeNumber(statement.depreciation, 0);
  // Cash moves with net income (add back the non-cash depreciation
  // charge) minus this cycle's debt repayment -- the same figures
  // computeCashFlow() below derives independently; kept in sync by both
  // reading from the same income statement.
  const cash = Math.max(0, Math.round(openingCash + netIncome + depreciation - debtRepaymentThisCycle));

  const totalAssets = cash + receivables + fixedAssets;
  const totalLiabilities = payables + debt;
  const equity = totalAssets - totalLiabilities;

  return {
    assets: { cash, receivables, fixedAssets, total: totalAssets },
    liabilities: { payables, debt, total: totalLiabilities },
    equity: { total: equity },
    debtRepaymentThisCycle,
  };
}

// 3. Cash-flow statement: exploitation / investissement / financement,
// reconciling the opening and closing cash positions computeBalanceSheet()
// already derived.
export function computeCashFlow({ incomeStatement, balanceSheet, previousCash = null, capex = 0 } = {}) {
  const statement = safeObject(incomeStatement);
  const sheet = safeObject(balanceSheet);
  const openingCash = previousCash ?? DEFAULT_OPENING_CASH;

  const netIncome = safeNumber(statement.netIncome, 0);
  const depreciation = safeNumber(statement.depreciation, 0);
  const operating = Math.round(netIncome + depreciation);

  const investing = -Math.round(safeNumber(capex, 0));

  const debtRepayment = safeNumber(sheet.debtRepaymentThisCycle, 0);
  const financing = -Math.round(debtRepayment);

  const net = operating + investing + financing;
  const closingCash = Math.max(0, Math.round(openingCash + net));

  return { operating, investing, financing, net, openingCash, closingCash };
}

// 4. The ratios hoteliers actually track. roomCount comes from the
// player's own rooms (see lib/guest/guestAdapter.js's seedRooms()/PMS).
export function computeRatios({ incomeStatement, balanceSheet, roomCount = 0 } = {}) {
  const statement = safeObject(incomeStatement);
  const sheet = safeObject(balanceSheet);
  const totalRevenue = safeNumber(statement.revenues?.total, 0);
  const availableRoomNights = Math.max(1, roomCount) * DAYS_PER_MONTH;

  const goppar = roomCount > 0 ? Math.round((safeNumber(statement.gop, 0) / availableRoomNights) * 100) / 100 : 0;
  const revpar = roomCount > 0 ? Math.round((safeNumber(statement.revenues?.hotel, 0) / availableRoomNights) * 100) / 100 : 0;
  const payrollRatio = totalRevenue > 0 ? round2(safeNumber(statement.expenses?.payroll, 0) / totalRevenue) : 0;
  const ebitdaMargin = totalRevenue > 0 ? round2(safeNumber(statement.ebitda, 0) / totalRevenue) : 0;

  const totalAssets = safeNumber(sheet.assets?.total, 0);
  const totalLiabilities = safeNumber(sheet.liabilities?.total, 0);
  const debtRatio = totalAssets > 0 ? round2(totalLiabilities / totalAssets) : 0;

  const currentAssets = safeNumber(sheet.assets?.cash, 0) + safeNumber(sheet.assets?.receivables, 0);
  const currentLiabilities = safeNumber(sheet.liabilities?.payables, 0) || 1;
  const liquidityRatio = round2(currentAssets / currentLiabilities);

  return { goppar, revpar, payrollRatio, ebitdaMargin, debtRatio, liquidityRatio };
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
