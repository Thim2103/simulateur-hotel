// Financial diagnostics -- same anomaly/error/opportunity vocabulary
// lib/analytics/analyticsDiagnostics.js already uses for scenario runs,
// applied to one finance cycle's own numbers instead of a whole replay's
// worth of cycles. See financeReports.js's financeDiagnosticsToAnalytics()
// for how these fold into the Analytics module's own diagnostics list.
import { safeNumber, safeObject } from "../safe";

const DIAGNOSTIC_TYPES = ["anomaly", "error", "opportunity"];

function diagnostic(type, severity, message) {
  return { type: DIAGNOSTIC_TYPES.includes(type) ? type : "anomaly", severity, message };
}

export function generateFinancialDiagnostics({ incomeStatement, balanceSheet, ratios } = {}) {
  const statement = safeObject(incomeStatement);
  const sheet = safeObject(balanceSheet);
  const kpis = safeObject(ratios);
  const diagnostics = [];

  const netIncome = safeNumber(statement.netIncome, 0);
  if (netIncome < 0) {
    diagnostics.push(diagnostic("error", "high", `Résultat net négatif (${netIncome} €) : les charges dépassent les revenus ce cycle.`));
  }

  const gop = safeNumber(statement.gop, 0);
  if (gop < 0) {
    diagnostics.push(diagnostic("error", "high", `GOP négatif (${gop} €) : même avant charges fixes, l'exploitation est déficitaire.`));
  }

  if (kpis.liquidityRatio !== undefined && kpis.liquidityRatio < 1) {
    diagnostics.push(diagnostic("error", "high", `Liquidité insuffisante (ratio ${kpis.liquidityRatio}) : la trésorerie et les créances ne couvrent pas les dettes court terme.`));
  }

  if (kpis.debtRatio !== undefined && kpis.debtRatio > 0.7) {
    diagnostics.push(diagnostic("anomaly", "medium", `Endettement élevé (ratio ${kpis.debtRatio}) : plus de 70% des actifs sont financés par la dette.`));
  }

  if (kpis.payrollRatio !== undefined && kpis.payrollRatio > 0.45) {
    diagnostics.push(diagnostic("anomaly", "medium", `Masse salariale élevée (${Math.round(kpis.payrollRatio * 100)}% du revenu) : envisager d'ajuster le staffing.`));
  }

  const cash = safeNumber(sheet.assets?.cash, 0);
  if (cash < safeNumber(sheet.liabilities?.payables, 0)) {
    diagnostics.push(diagnostic("error", "high", `Trésorerie sous le seuil des dettes fournisseurs (${cash} €) : risque de tension de trésorerie.`));
  }

  if (kpis.ebitdaMargin !== undefined && kpis.ebitdaMargin >= 0.3 && netIncome > 0) {
    diagnostics.push(diagnostic("opportunity", "low", `Marge EBITDA solide (${Math.round(kpis.ebitdaMargin * 100)}%) : capacité à investir ou réduire l'endettement.`));
  }

  if (kpis.payrollRatio !== undefined && kpis.payrollRatio < 0.2 && netIncome > 0) {
    diagnostics.push(diagnostic("opportunity", "low", `Masse salariale faible (${Math.round(kpis.payrollRatio * 100)}% du revenu) : marge pour renforcer les équipes sans dégrader la rentabilité.`));
  }

  return diagnostics;
}
