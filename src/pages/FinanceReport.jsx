import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useFinance } from "../hooks/useFinance";
import { exportFinancialReportHtml } from "../lib/finance/financeReports";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };

// The full financial report -- compte de résultats/bilan/cash-flow/
// ratios/diagnostics détaillés, an HTML export (not PDF, see the Refonte
// Finance request's section 4), and the finance module's own replay log
// (one entry per cycle played, see lib/finance/financeEngine.js's
// runFinanceCycle()).
export default function FinanceReport() {
  const { financeState, isRunning, error, loadFinanceState, getFinancialReport } = useFinance();
  const [selectedCycle, setSelectedCycle] = useState(null);

  useEffect(() => {
    loadFinanceState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const report = getFinancialReport();
  const replayEntries = report.replay?.entries || [];

  const handleExport = () => {
    const html = exportFinancialReportHtml(report);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (isRunning && !financeState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement du rapport financier…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Finance</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rapport financier complet</h1>
          <p className="mt-1 text-sm text-slate-500">{report.period ? `Période : ${report.period}` : "Aucun cycle financier pour le moment."}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!financeState}>Exporter en HTML</Button>
          <Link to="/finance"><Button variant="outline">← Retour</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!financeState ? (
        <Card><p className="text-sm text-slate-500">Aucune donnée financière pour le moment. Visitez la page Finance pour démarrer un cycle.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card title="Compte de résultats">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>Revenus hôtel : {report.incomeStatement.revenues.hotel.toLocaleString()} €</li>
                <li>Revenus restaurant : {report.incomeStatement.revenues.restaurant.toLocaleString()} €</li>
                <li>Charges variables : {report.incomeStatement.expenses.variable.toLocaleString()} €</li>
                <li>Masse salariale : {report.incomeStatement.expenses.payroll.toLocaleString()} €</li>
                <li>Charges fixes : {report.incomeStatement.expenses.fixed.toLocaleString()} €</li>
                <li className="font-semibold">GOP : {report.incomeStatement.gop.toLocaleString()} €</li>
                <li className="font-semibold">EBITDA : {report.incomeStatement.ebitda.toLocaleString()} €</li>
                <li className="font-semibold">Résultat net : {report.incomeStatement.netIncome.toLocaleString()} €</li>
              </ul>
            </Card>
            <Card title="Bilan">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>Trésorerie : {report.balanceSheet.assets.cash.toLocaleString()} €</li>
                <li>Créances : {report.balanceSheet.assets.receivables.toLocaleString()} €</li>
                <li>Actifs immobilisés : {report.balanceSheet.assets.fixedAssets.toLocaleString()} €</li>
                <li className="font-semibold">Total actifs : {report.balanceSheet.assets.total.toLocaleString()} €</li>
                <li>Dettes fournisseurs : {report.balanceSheet.liabilities.payables.toLocaleString()} €</li>
                <li>Dette : {report.balanceSheet.liabilities.debt.toLocaleString()} €</li>
                <li className="font-semibold">Capitaux propres : {report.balanceSheet.equity.total.toLocaleString()} €</li>
              </ul>
            </Card>
            <Card title="Cash-flow">
              <ul className="flex flex-col gap-2 text-sm text-slate-700">
                <li>Exploitation : {report.cashFlow.operating.toLocaleString()} €</li>
                <li>Investissement : {report.cashFlow.investing.toLocaleString()} €</li>
                <li>Financement : {report.cashFlow.financing.toLocaleString()} €</li>
                <li className="font-semibold">Trésorerie de clôture : {report.cashFlow.closingCash.toLocaleString()} €</li>
              </ul>
            </Card>
          </div>

          <section aria-labelledby="finance-report-diagnostics" className="flex flex-col gap-3">
            <h2 id="finance-report-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics détaillés</h2>
            <Card>
              {report.diagnostics.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun diagnostic.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {report.diagnostics.map((diagnostic, index) => (
                    <li key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                      <span className="text-slate-700">{diagnostic.message}</span>
                      <Badge type={SEVERITY_BADGE[diagnostic.severity] || "info"}>{diagnostic.type} · {diagnostic.severity}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section aria-labelledby="finance-replay" className="flex flex-col gap-3">
            <h2 id="finance-replay" className="text-base font-semibold text-slate-900">Replay financier ({replayEntries.length} cycle{replayEntries.length > 1 ? "s" : ""})</h2>
            <Card>
              {replayEntries.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun cycle enregistré.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {replayEntries.map((entry) => (
                    <li key={entry.cycleIndex}>
                      <button
                        type="button"
                        onClick={() => setSelectedCycle(entry)}
                        className="w-full rounded-lg border border-slate-200 p-2 text-left hover:border-cyan-400"
                      >
                        Cycle {entry.cycleIndex + 1} · {entry.period} · GOP {entry.incomeStatement.gop.toLocaleString()} €
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedCycle && (
                <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
                  Cycle {selectedCycle.cycleIndex + 1} : revenus {selectedCycle.incomeStatement.revenues.total.toLocaleString()} €, charges {selectedCycle.incomeStatement.expenses.total.toLocaleString()} €, résultat net {selectedCycle.incomeStatement.netIncome.toLocaleString()} €.
                </div>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
