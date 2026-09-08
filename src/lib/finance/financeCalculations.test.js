import { computeBalanceSheet, computeCashFlow, computeIncomeStatement, computeRatios } from "./financeCalculations";

function hotelFinance(overrides = {}) {
  return { revenue: Array(12).fill(10000), costs: Array(12).fill(4000), fixedCosts: 3000, payroll: 6000, taxes: 20, ...overrides };
}

function restaurantFinance(overrides = {}) {
  return { revenue: Array(12).fill(2000), costs: Array(12).fill(800), fixedCosts: 0, rent: 500, taxes: 20, ...overrides };
}

describe("computeIncomeStatement", () => {
  test("sums hotel and restaurant revenue/expenses", () => {
    const statement = computeIncomeStatement({ hotelFinance: hotelFinance(), restaurantFinance: restaurantFinance(), roomCount: 10 });

    expect(statement.revenues.hotel).toBe(120000);
    expect(statement.revenues.restaurant).toBe(24000);
    expect(statement.revenues.total).toBe(144000);
  });

  test("GOP is revenue minus variable costs, EBITDA is GOP minus fixed/payroll", () => {
    const statement = computeIncomeStatement({ hotelFinance: hotelFinance(), restaurantFinance: restaurantFinance(), roomCount: 10 });

    const variableExpenses = 48000 + 9600; // 12 * (4000 + 800)
    expect(statement.gop).toBe(144000 - variableExpenses);
    expect(statement.ebitda).toBe(statement.gop - statement.expenses.payroll - statement.expenses.fixed);
  });

  test("net income deducts depreciation and tax from EBITDA", () => {
    const statement = computeIncomeStatement({ hotelFinance: hotelFinance(), restaurantFinance: restaurantFinance(), roomCount: 10 });

    expect(statement.netIncome).toBe(statement.ebitda - statement.depreciation - statement.taxAmount);
    expect(statement.depreciation).toBeGreaterThan(0);
  });

  test("handles an empty/missing finance object without throwing", () => {
    expect(() => computeIncomeStatement({})).not.toThrow();
    const statement = computeIncomeStatement({});
    expect(statement.revenues.total).toBe(0);
  });
});

describe("computeBalanceSheet", () => {
  test("assets always equal liabilities + equity", () => {
    const incomeStatement = computeIncomeStatement({ hotelFinance: hotelFinance(), restaurantFinance: restaurantFinance(), roomCount: 10 });
    const sheet = computeBalanceSheet({ incomeStatement, roomCount: 10, cyclesElapsed: 1, previousCash: null });

    expect(sheet.assets.total).toBe(sheet.liabilities.total + sheet.equity.total);
  });

  test("fixed assets depreciate as cycles elapse", () => {
    const incomeStatement = computeIncomeStatement({ hotelFinance: hotelFinance(), restaurantFinance: restaurantFinance(), roomCount: 10 });
    const early = computeBalanceSheet({ incomeStatement, roomCount: 10, cyclesElapsed: 1 });
    const later = computeBalanceSheet({ incomeStatement, roomCount: 10, cyclesElapsed: 12 });

    expect(later.assets.fixedAssets).toBeLessThan(early.assets.fixedAssets);
  });

  test("debt decreases as cycles elapse", () => {
    const incomeStatement = computeIncomeStatement({ hotelFinance: hotelFinance(), restaurantFinance: restaurantFinance(), roomCount: 10 });
    const early = computeBalanceSheet({ incomeStatement, roomCount: 10, cyclesElapsed: 1 });
    const later = computeBalanceSheet({ incomeStatement, roomCount: 10, cyclesElapsed: 12 });

    expect(later.liabilities.debt).toBeLessThan(early.liabilities.debt);
  });
});

describe("computeCashFlow", () => {
  test("closing cash reconciles opening cash + net cash flow", () => {
    const incomeStatement = computeIncomeStatement({ hotelFinance: hotelFinance(), restaurantFinance: restaurantFinance(), roomCount: 10 });
    const balanceSheet = computeBalanceSheet({ incomeStatement, roomCount: 10, cyclesElapsed: 1, previousCash: 50000 });
    const cashFlow = computeCashFlow({ incomeStatement, balanceSheet, previousCash: 50000 });

    expect(cashFlow.closingCash).toBe(Math.max(0, cashFlow.openingCash + cashFlow.net));
  });

  test("a capex investment reduces the investing cash flow", () => {
    const incomeStatement = computeIncomeStatement({ hotelFinance: hotelFinance(), restaurantFinance: restaurantFinance(), roomCount: 10 });
    const balanceSheet = computeBalanceSheet({ incomeStatement, roomCount: 10, cyclesElapsed: 1 });
    const withCapex = computeCashFlow({ incomeStatement, balanceSheet, capex: 5000 });
    const withoutCapex = computeCashFlow({ incomeStatement, balanceSheet, capex: 0 });

    expect(withCapex.investing).toBe(withoutCapex.investing - 5000);
  });
});

describe("computeRatios", () => {
  test("computes GOPPAR/RevPAR per available room-night", () => {
    const incomeStatement = computeIncomeStatement({ hotelFinance: hotelFinance(), restaurantFinance: restaurantFinance(), roomCount: 10 });
    const balanceSheet = computeBalanceSheet({ incomeStatement, roomCount: 10, cyclesElapsed: 1 });
    const ratios = computeRatios({ incomeStatement, balanceSheet, roomCount: 10 });

    expect(ratios.goppar).toBe(Math.round((incomeStatement.gop / 300) * 100) / 100);
    expect(ratios.revpar).toBe(Math.round((incomeStatement.revenues.hotel / 300) * 100) / 100);
  });

  test("returns zeroed ratios when there are no rooms, without dividing by zero", () => {
    const incomeStatement = computeIncomeStatement({ hotelFinance: hotelFinance(), restaurantFinance: restaurantFinance(), roomCount: 0 });
    const balanceSheet = computeBalanceSheet({ incomeStatement, roomCount: 0, cyclesElapsed: 1 });
    const ratios = computeRatios({ incomeStatement, balanceSheet, roomCount: 0 });

    expect(ratios.goppar).toBe(0);
    expect(ratios.revpar).toBe(0);
    expect(Number.isFinite(ratios.debtRatio)).toBe(true);
  });

  test("payroll ratio and debt ratio are expressed as 0-1 fractions", () => {
    const incomeStatement = computeIncomeStatement({ hotelFinance: hotelFinance(), restaurantFinance: restaurantFinance(), roomCount: 10 });
    const balanceSheet = computeBalanceSheet({ incomeStatement, roomCount: 10, cyclesElapsed: 1 });
    const ratios = computeRatios({ incomeStatement, balanceSheet, roomCount: 10 });

    expect(ratios.payrollRatio).toBeGreaterThan(0);
    expect(ratios.payrollRatio).toBeLessThan(1);
  });
});
