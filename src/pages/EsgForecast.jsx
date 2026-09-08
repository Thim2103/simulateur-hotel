import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import { useEsgEngine } from "../hooks/useEsgEngine";

const SCENARIO_LABEL = { optimiste: "Optimiste", realiste: "Réaliste", pessimiste: "Pessimiste" };
const SCENARIOS_ORDER = ["optimiste", "realiste", "pessimiste"];

// 30-day ESG forecast, three scenarios (see lib/esg/esgForecast.js's
// generateEsgForecast()) -- the Refonte ESG request's section 4.
export default function EsgForecast() {
  const { esgState, isRunning, error, loadEsgState, getEsgForecast } = useEsgEngine();
  const [scenario, setScenario] = useState("realiste");

  useEffect(() => {
    loadEsgState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forecast = getEsgForecast();

  if (isRunning && !esgState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des prévisions ESG…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">ESG</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Prévisions ESG</h1>
          <p className="mt-1 text-sm text-slate-500">Projection sur {forecast?.horizonDays || 30} jours, trois scénarios.</p>
        </div>
        <Link to="/esg"><Button variant="outline">← Retour</Button></Link>
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
                  <KpiCard label="Énergie moyenne prévue" value={`${data.avgEnergy.toLocaleString()} kWh`} />
                  <KpiCard label="CO₂ en fin de période" value={`${data.endCo2.toLocaleString()} kg`} trend={data.endCo2 <= data.avgCo2 ? undefined : -1} />
                  <KpiCard label="Score ESG en fin de période" value={`${data.endScore}/100`} trend={data.endScore >= 55 ? undefined : -1} />
                </div>

                {/* key={scenario}: mounts a fresh chart per scenario --
                    see pages/FinanceForecast.jsx's own comment for the
                    jsdom/react-chartjs-2 update-path quirk this avoids. */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <LineChart key={`energy-${scenario}`} title={`Énergie prévue (${SCENARIO_LABEL[scenario]})`} labels={data.days.map((d) => `J${d.day}`)} data={data.days.map((d) => d.energy)} />
                  <LineChart key={`score-${scenario}`} title={`Score ESG prévu (${SCENARIO_LABEL[scenario]})`} labels={data.days.map((d) => `J${d.day}`)} data={data.days.map((d) => d.score)} />
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
                  <p className="text-xs text-slate-500">CO₂ final : {forecast.scenarios[key].endCo2.toLocaleString()} kg</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
