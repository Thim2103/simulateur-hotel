import { generateFinancialDiagnostics } from "./financeDiagnostics";

test("flags a negative net income as an error", () => {
  const diagnostics = generateFinancialDiagnostics({ incomeStatement: { netIncome: -500, gop: 1000 }, balanceSheet: { assets: { cash: 1000 }, liabilities: { payables: 100 } }, ratios: {} });
  expect(diagnostics.some((d) => d.type === "error" && /négatif/.test(d.message))).toBe(true);
});

test("flags a negative GOP as an error", () => {
  const diagnostics = generateFinancialDiagnostics({ incomeStatement: { netIncome: 100, gop: -50 }, balanceSheet: { assets: { cash: 1000 }, liabilities: { payables: 100 } }, ratios: {} });
  expect(diagnostics.some((d) => d.type === "error" && /GOP négatif/.test(d.message))).toBe(true);
});

test("flags low liquidity as an error", () => {
  const diagnostics = generateFinancialDiagnostics({ incomeStatement: { netIncome: 100, gop: 100 }, balanceSheet: { assets: { cash: 1000 }, liabilities: { payables: 100 } }, ratios: { liquidityRatio: 0.5 } });
  expect(diagnostics.some((d) => d.type === "error" && /liquidité/i.test(d.message))).toBe(true);
});

test("flags a high debt ratio as an anomaly", () => {
  const diagnostics = generateFinancialDiagnostics({ incomeStatement: { netIncome: 100, gop: 100 }, balanceSheet: { assets: { cash: 1000 }, liabilities: { payables: 100 } }, ratios: { debtRatio: 0.8 } });
  expect(diagnostics.some((d) => d.type === "anomaly" && /endettement/i.test(d.message))).toBe(true);
});

test("flags a high payroll ratio as an anomaly", () => {
  const diagnostics = generateFinancialDiagnostics({ incomeStatement: { netIncome: 100, gop: 100 }, balanceSheet: { assets: { cash: 1000 }, liabilities: { payables: 100 } }, ratios: { payrollRatio: 0.5 } });
  expect(diagnostics.some((d) => d.type === "anomaly" && /masse salariale/i.test(d.message))).toBe(true);
});

test("flags cash below payables as an error", () => {
  const diagnostics = generateFinancialDiagnostics({ incomeStatement: { netIncome: 100, gop: 100 }, balanceSheet: { assets: { cash: 50 }, liabilities: { payables: 200 } }, ratios: {} });
  expect(diagnostics.some((d) => d.type === "error" && /trésorerie/i.test(d.message))).toBe(true);
});

test("flags a solid EBITDA margin as an opportunity when profitable", () => {
  const diagnostics = generateFinancialDiagnostics({ incomeStatement: { netIncome: 500, gop: 1000 }, balanceSheet: { assets: { cash: 5000 }, liabilities: { payables: 100 } }, ratios: { ebitdaMargin: 0.4 } });
  expect(diagnostics.some((d) => d.type === "opportunity" && /marge ebitda/i.test(d.message))).toBe(true);
});

test("returns no diagnostics for a healthy, unremarkable finance snapshot", () => {
  const diagnostics = generateFinancialDiagnostics({
    incomeStatement: { netIncome: 500, gop: 1000 },
    balanceSheet: { assets: { cash: 5000 }, liabilities: { payables: 100 } },
    ratios: { liquidityRatio: 3, debtRatio: 0.3, payrollRatio: 0.3, ebitdaMargin: 0.15 },
  });
  expect(diagnostics).toEqual([]);
});

test("never throws on missing input", () => {
  expect(() => generateFinancialDiagnostics({})).not.toThrow();
  expect(generateFinancialDiagnostics({})).toEqual([]);
});
