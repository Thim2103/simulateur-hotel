import { exportFinancialReportHtml, financeDiagnosticsToAnalytics, generateFinancialReport } from "./financeReports";
import { createFinanceState } from "./financeState";

function sampleState() {
  return createFinanceState({
    period: "2026-09",
    incomeStatement: { revenues: { total: 144000 }, expenses: { total: 90000 }, gop: 80000, ebitda: 54000, netIncome: 40000 },
    balanceSheet: { assets: { total: 500000 }, liabilities: { total: 200000 }, equity: { total: 300000 } },
    cashFlow: { operating: 40000, investing: 0, financing: -1000, closingCash: 89000 },
    ratios: { goppar: 20, revpar: 15, payrollRatio: 0.3, debtRatio: 0.4, liquidityRatio: 2 },
    diagnostics: [{ type: "opportunity", severity: "low", message: "Marge solide." }],
  });
}

test("generateFinancialReport assembles every section from the FinanceState", () => {
  const report = generateFinancialReport(sampleState());
  expect(report.period).toBe("2026-09");
  expect(report.incomeStatement.gop).toBe(80000);
  expect(report.balanceSheet.equity.total).toBe(300000);
  expect(report.cashFlow.closingCash).toBe(89000);
  expect(report.ratios.goppar).toBe(20);
  expect(report.diagnostics).toHaveLength(1);
  expect(report.replay.totalCycles).toBe(0);
});

test("financeDiagnosticsToAnalytics adapts to the Analytics diagnostic shape", () => {
  const adapted = financeDiagnosticsToAnalytics([{ type: "error", severity: "high", message: "Résultat net négatif." }]);
  expect(adapted).toEqual([{ type: "error", severity: "high", message: "Résultat net négatif.", cycleIndex: null }]);
});

test("exportFinancialReportHtml produces a self-contained HTML document", () => {
  const html = exportFinancialReportHtml(generateFinancialReport(sampleState()));
  expect(html).toContain("<!doctype html>");
  expect(html).toContain("Rapport financier");
  expect(html).toContain("80000");
  expect(html).toContain("Marge solide.");
});

test("never throws on missing input", () => {
  expect(() => generateFinancialReport(null)).not.toThrow();
  expect(() => exportFinancialReportHtml(null)).not.toThrow();
  expect(() => financeDiagnosticsToAnalytics(null)).not.toThrow();
});
