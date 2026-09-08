import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import { useTfeEngine } from "../hooks/useTfeEngine";

const SCENARIO_LABEL = { optimiste: "Optimiste", realiste: "Réaliste", pessimiste: "Pessimiste" };
const SCENARIOS_ORDER = ["optimiste", "realiste", "pessimiste"];

// Route: /tfe/forecast -- "prévisions 36 mois / scénarios (optimiste /
// réaliste / pessimiste)" (section 4), same pattern every other module's
// own *Forecast.jsx page already uses, but over the TFE's full 3-year
// horizon.
export default function TfeForecast() {
  const { tfeState, isRunning, error, loadTfeState, getTfeForecast } = useTfeEngine();
  const [scenario, setScenario] = useState("realiste");

  useEffect(() => {
    loadTfeState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forecast = getTfeForecast();

  if (isRunning && !tfeState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des prévisions TFE…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">TFE</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Prévisions TFE</h1>
          <p className="mt-1 text-sm text-slate-500">Projection sur {forecast?.horizonMonths || 36} mois, trois scénarios.</p>
        </div>
        <Link to="/tfe/dashboard"><Button variant="outline">← Retour</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!forecast ? (
        <Card><p className="text-sm text-slate-500">Aucune prévision pour le moment. Jouez au moins un mois depuis le tableau de bord TFE.</p></Card>
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
                  <KpiCard label="Score moyen prévu" value={`${data.avgScore}/100`} />
                  <KpiCard label="Score en fin de période" value={`${data.endScore}/100`} trend={data.endScore >= 60 ? undefined : -1} />
                  <KpiCard label="Marge EBITDA finale" value={`${Math.round((data.endEbitdaMargin || 0) * 100)}%`} trend={data.endEbitdaMargin >= 0 ? undefined : -1} />
                </div>

                {/* key={scenario}: mounts a fresh chart per scenario --
                    see pages/FinanceForecast.jsx's own comment for the
                    jsdom/react-chartjs-2 update-path quirk this avoids. */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <LineChart key={`score-${scenario}`} title={`Score prévu (${SCENARIO_LABEL[scenario]})`} labels={data.months.map((m) => `M${m.month}`)} data={data.months.map((m) => m.score)} />
                  <LineChart key={`margin-${scenario}`} title={`Marge EBITDA prévue (${SCENARIO_LABEL[scenario]})`} labels={data.months.map((m) => `M${m.month}`)} data={data.months.map((m) => Math.round((m.ebitdaMargin || 0) * 100))} />
                </div>
              </>
            );
          })()}

          <Card title="Comparaison des scénarios">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {SCENARIOS_ORDER.map((key) => (
                <div key={key} className={`rounded-lg border p-3 ${scenario === key ? "border-cyan-400 bg-cyan-50" : "border-slate-200"}`}>
                  <p className="text-sm font-semibold text-slate-900">{SCENARIO_LABEL[key]}</p>
                  <p className="mt-1 text-xs text-slate-500">Score final : {forecast.scenarios[key].endScore}/100</p>
                  <p className="text-xs text-slate-500">Marge EBITDA finale : {Math.round((forecast.scenarios[key].endEbitdaMargin || 0) * 100)}%</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
