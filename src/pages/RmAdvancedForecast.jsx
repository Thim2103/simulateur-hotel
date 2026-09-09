import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import { useCareerContext } from "../context/CareerContext";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";

const SCENARIO_LABELS = { optimiste: "Optimiste", base: "Base", pessimiste: "Pessimiste" };

// Route: /rm-advanced/forecast -- 30-day RM Advanced forecast, three
// scenarios (optimiste/base/pessimiste), built on useRmAdvancedEngine.js.
export default function RmAdvancedForecast() {
  const { careerState } = useCareerContext();
  const { rmAdvancedState, isRunning, error, loadRmAdvancedState } = useRmAdvancedEngine();
  const [activeScenario, setActiveScenario] = useState("base");

  useEffect(() => {
    loadRmAdvancedState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Revenue Management avancé</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Prévisions RM avancé</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir les prévisions RM avancé.</p>
          </div>
        </header>
        <Card><Link to="/rm-advanced"><Button>← Retour</Button></Link></Card>
      </div>
    );
  }

  const forecast = rmAdvancedState?.forecast;
  const scenario = forecast?.scenarios?.[activeScenario];

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Revenue Management avancé</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Prévisions RM avancé</h1>
          <p className="mt-1 text-sm text-slate-500">
            Projection 30 jours -- compression, part directe et ADR net.
          </p>
        </div>
        <Link to="/rm-advanced"><Button variant="outline">← Dashboard RM avancé</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {isRunning && !rmAdvancedState ? (
        <Card><p className="text-sm text-slate-500">Chargement des prévisions…</p></Card>
      ) : !forecast ? (
        <Card><p className="text-sm text-slate-500">Jouez un cycle pour générer les prévisions RM avancé.</p></Card>
      ) : (
        <>
          <div role="tablist" className="flex gap-2">
            {Object.keys(forecast.scenarios).map((key) => (
              <Button
                key={key}
                role="tab"
                aria-selected={activeScenario === key}
                variant={activeScenario === key ? "primary" : "outline"}
                onClick={() => setActiveScenario(key)}
              >
                {SCENARIO_LABELS[key] || key}
              </Button>
            ))}
          </div>

          {scenario && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Compression moyenne" value={`${scenario.avgCompression}%`} />
                <KpiCard label="Compression fin période" value={`${scenario.endCompression}%`} />
                <KpiCard label="Part directe moyenne" value={`${scenario.avgDirectShare}%`} />
                <KpiCard label="ADR net fin période" value={`${scenario.endNetAdr} €`} />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <LineChart
                  title={`Prévision compression — ${SCENARIO_LABELS[activeScenario]}`}
                  labels={scenario.days.map((d) => `J${d.day}`)}
                  data={scenario.days.map((d) => d.compression)}
                />
                <LineChart
                  title={`Prévision part directe — ${SCENARIO_LABELS[activeScenario]}`}
                  labels={scenario.days.map((d) => `J${d.day}`)}
                  data={scenario.days.map((d) => d.directShare)}
                />
              </div>
            </>
          )}

          <Card>
            <p className="text-xs text-slate-500">
              Horizon : {forecast.horizonDays} jours. Généré le {new Date(forecast.generatedAt).toLocaleDateString("fr-FR")}.
              Les prévisions sont des projections basées sur la run-rate actuelle, sans garantie.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
