// Assembles the full financial report FinanceReport.jsx shows/exports,
// and adapts financeDiagnostics.js's output into the same {type,
// severity, message} shape lib/analytics/analyticsDiagnostics.js uses --
// "intégrer les diagnostics financiers dans analyticsEngine" (see the
// Refonte Finance request's section 5): rather than reaching into
// analyticsEngine's internals (which reason about a whole ReplayRun's
// cycles, not one finance snapshot), this hands back a list in the exact
// shape analyzeRun()'s own diagnostics already have, so a caller (e.g.
// Dashboard.jsx, or a future pass over Analytics) can concat the two
// lists and treat them identically.
import { safeArray, safeObject } from "../safe";

export function generateFinancialReport(financeState) {
  const state = safeObject(financeState);
  return {
    period: state.period,
    generatedAt: new Date().toISOString(),
    incomeStatement: state.incomeStatement,
    balanceSheet: state.balanceSheet,
    cashFlow: state.cashFlow,
    ratios: state.ratios,
    diagnostics: safeArray(state.diagnostics),
    forecast: state.forecast,
    replay: { totalCycles: safeArray(state.replayLog?.entries).length, entries: safeArray(state.replayLog?.entries) },
  };
}

// See this file's header: same shape as an Analytics diagnostic, so it
// can be merged straight into an Analysis object's own `diagnostics`.
export function financeDiagnosticsToAnalytics(financeDiagnostics) {
  return safeArray(financeDiagnostics).map((entry) => ({ type: entry.type, severity: entry.severity, message: entry.message, cycleIndex: null }));
}

// A single self-contained HTML document -- "export HTML (pas PDF)" (see
// the Refonte Finance request's section 4): plain enough to open in any
// browser or print-to-PDF from there, no external assets, no template
// engine.
export function exportFinancialReportHtml(report) {
  const data = safeObject(report);
  const statement = safeObject(data.incomeStatement);
  const sheet = safeObject(data.balanceSheet);
  const flow = safeObject(data.cashFlow);
  const ratios = safeObject(data.ratios);

  const row = (label, value) => `<tr><td>${label}</td><td style="text-align:right">${value}</td></tr>`;
  const diagnosticsRows = safeArray(data.diagnostics)
    .map((d) => `<li><strong>[${d.severity}]</strong> ${d.message}</li>`)
    .join("");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Rapport financier -- ${data.period || ""}</title>
<style>
body { font-family: system-ui, sans-serif; margin: 2rem; color: #0f172a; }
h1, h2 { color: #0f172a; }
table { border-collapse: collapse; width: 100%; margin-bottom: 1.5rem; }
td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; }
ul { padding-left: 1.2rem; }
</style>
</head>
<body>
<h1>Rapport financier</h1>
<p>Généré le ${data.generatedAt || new Date().toISOString()}</p>

<h2>Compte de résultats</h2>
<table>
${row("Revenus totaux", `${statement.revenues?.total ?? 0} €`)}
${row("Charges totales", `${statement.expenses?.total ?? 0} €`)}
${row("GOP", `${statement.gop ?? 0} €`)}
${row("EBITDA", `${statement.ebitda ?? 0} €`)}
${row("Résultat net", `${statement.netIncome ?? 0} €`)}
</table>

<h2>Bilan</h2>
<table>
${row("Actifs totaux", `${sheet.assets?.total ?? 0} €`)}
${row("Passifs totaux", `${sheet.liabilities?.total ?? 0} €`)}
${row("Capitaux propres", `${sheet.equity?.total ?? 0} €`)}
</table>

<h2>Cash-flow</h2>
<table>
${row("Exploitation", `${flow.operating ?? 0} €`)}
${row("Investissement", `${flow.investing ?? 0} €`)}
${row("Financement", `${flow.financing ?? 0} €`)}
${row("Trésorerie de clôture", `${flow.closingCash ?? 0} €`)}
</table>

<h2>Ratios</h2>
<table>
${row("GOPPAR", `${ratios.goppar ?? 0} €`)}
${row("RevPAR", `${ratios.revpar ?? 0} €`)}
${row("Payroll ratio", `${Math.round((ratios.payrollRatio ?? 0) * 100)}%`)}
${row("Debt ratio", `${Math.round((ratios.debtRatio ?? 0) * 100)}%`)}
${row("Liquidity ratio", ratios.liquidityRatio ?? 0)}
</table>

<h2>Diagnostics</h2>
<ul>${diagnosticsRows || "<li>Aucun diagnostic.</li>"}</ul>
</body>
</html>`;
}
