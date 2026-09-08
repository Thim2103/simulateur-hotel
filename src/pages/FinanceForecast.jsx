import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import { useFinance } from "../hooks/useFinance";

const SCENARIO_LABEL = { optimiste: "Optimiste", realiste: "Réaliste", pessimiste: "Pessimiste" };
const SCENARIOS_ORDER = ["optimiste", "realiste", "pessimiste"];

// 30-day forecast, three scenarios (see lib/finance/financeForecast.js's
// generateFinancialForecast()) -- the Refonte Finance request's section 4.
export default function FinanceForecast() {
  const { financeState, isRunning, error, loadFinanceState, getFinancialForecast } = useFinance();
  const [scenario, setScenario] = useState("realiste");

  useEffect(() => {
    loadFinanceState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forecast = getFinancialForecast();

  if (isRunning && !financeState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des prévisions…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Finance</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Prévisions financières</h1>
          <p className="mt-1 text-sm text-slate-500">Projection sur {forecast?.horizonDays || 30} jours, trois scénarios.</p>
        </div>
        <Link to="/finance"><Button variant="outline">← Retour</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!forecast ? (
        <Card><p className="text-sm text-slate-500">Aucune prévision pour le moment.</p></Card>
      ) : (
        <>
          <div role="tablist" aria-label="Scénario" className="flex gap-2">
            {SCENARIOS_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={scenario === key}
                onClick={() => setScenario(key)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                  scenario === key ? "bg-cyan-700 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {SCENARIO_LABEL[key]}
              </button>
            ))}
          </div>

          {(() => {
            const data = forecast.scenarios[scenario];
            return (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <KpiCard label="Revenus prévus (30j)" value={`${data.totalRevenue.toLocaleString()} €`} />
                  <KpiCard label="Charges prévues (30j)" value={`${data.totalExpenses.toLocaleString()} €`} />
                  <KpiCard label="Trésorerie de clôture" value={`${data.closingCash.toLocaleString()} €`} trend={data.totalProfit >= 0 ? undefined : -1} />
                </div>

                {/* key={scenario}: mounts a fresh chart per scenario instead of
                    updating the same Chart.js instance in place -- avoids
                    react-chartjs-2's own update-path quirks when every
                    dataset value changes at once (all 30 points, on every
                    tab switch). */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <LineChart key={`revenue-${scenario}`} title={`Revenus prévus (${SCENARIO_LABEL[scenario]})`} labels={data.days.map((d) => `J${d.day}`)} data={data.days.map((d) => d.revenue)} />
                  <LineChart key={`cash-${scenario}`} title={`Trésorerie prévue (${SCENARIO_LABEL[scenario]})`} labels={data.days.map((d) => `J${d.day}`)} data={data.days.map((d) => d.cash)} />
                </div>
              </>
            );
          })()}

          <Card title="Comparaison des scénarios">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {SCENARIOS_ORDER.map((key) => (
                <div key={key} className={`rounded-lg border p-3 ${scenario === key ? "border-cyan-400 bg-cyan-50" : "border-slate-200"}`}>
                  <p className="text-sm font-semibold text-slate-900">{SCENARIO_LABEL[key]}</p>
                  <p className="mt-1 text-xs text-slate-500">Profit prévu : {forecast.scenarios[key].totalProfit.toLocaleString()} €</p>
                  <p className="text-xs text-slate-500">Trésorerie finale : {forecast.scenarios[key].closingCash.toLocaleString()} €</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
