import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import { useStaffEngine } from "../hooks/useStaffEngine";

const SCENARIO_LABEL = { optimiste: "Optimiste", realiste: "Réaliste", pessimiste: "Pessimiste" };
const SCENARIOS_ORDER = ["optimiste", "realiste", "pessimiste"];

// 30-day HR forecast, three scenarios (see lib/staff/staffForecast.js's
// generateStaffForecast()) -- the Refonte RH request's section 4.
export default function StaffForecast() {
  const { staffState, isRunning, error, loadStaffState, getStaffForecast } = useStaffEngine();
  const [scenario, setScenario] = useState("realiste");

  useEffect(() => {
    loadStaffState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forecast = getStaffForecast();

  if (isRunning && !staffState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des prévisions RH…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Staff</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Prévisions RH</h1>
          <p className="mt-1 text-sm text-slate-500">Projection sur {forecast?.horizonDays || 30} jours, trois scénarios.</p>
        </div>
        <Link to="/staff"><Button variant="outline">← Retour</Button></Link>
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
                  <KpiCard label="Moral moyen prévu" value={`${data.avgMorale}/100`} trend={data.avgMorale >= 55 ? undefined : -1} />
                  <KpiCard label="Absentéisme moyen prévu" value={`${data.avgAbsenteeism}%`} trend={data.avgAbsenteeism <= 15 ? undefined : -1} />
                  <KpiCard label="Surcharge en fin de période" value={`${data.endOverload}%`} trend={data.endOverload <= 100 ? undefined : -1} />
                </div>

                {/* key={scenario}: mounts a fresh chart per scenario instead of
                    updating the same Chart.js instance in place -- see
                    pages/FinanceForecast.jsx's own comment for the
                    jsdom/react-chartjs-2 update-path quirk this avoids. */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <LineChart key={`morale-${scenario}`} title={`Moral prévu (${SCENARIO_LABEL[scenario]})`} labels={data.days.map((d) => `J${d.day}`)} data={data.days.map((d) => d.morale)} />
                  <LineChart key={`overload-${scenario}`} title={`Surcharge prévue (${SCENARIO_LABEL[scenario]})`} labels={data.days.map((d) => `J${d.day}`)} data={data.days.map((d) => d.overload)} />
                </div>
              </>
            );
          })()}

          <Card title="Comparaison des scénarios">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {SCENARIOS_ORDER.map((key) => (
                <div key={key} className={`rounded-lg border p-3 ${scenario === key ? "border-cyan-400 bg-cyan-50" : "border-slate-200"}`}>
                  <p className="text-sm font-semibold text-slate-900">{SCENARIO_LABEL[key]}</p>
                  <p className="mt-1 text-xs text-slate-500">Moral moyen : {forecast.scenarios[key].avgMorale}/100</p>
                  <p className="text-xs text-slate-500">Surcharge finale : {forecast.scenarios[key].endOverload}%</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
