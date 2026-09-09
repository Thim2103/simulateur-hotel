import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import { useCareerContext } from "../context/CareerContext";
import { useClientsEngine } from "../hooks/useClientsEngine";

const SCENARIO_LABELS = { optimiste: "Optimiste", realiste: "Réaliste", pessimiste: "Pessimiste" };

// Route: /clients/forecast -- 30-day clients forecast, three scenarios
// (optimiste/réaliste/pessimiste), built on useClientsEngine.js.
export default function ClientsForecast() {
  const { careerState } = useCareerContext();
  const { clientsState, isRunning, error, loadClientsState } = useClientsEngine();
  const [activeScenario, setActiveScenario] = useState("realiste");

  useEffect(() => {
    loadClientsState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Relation client</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Prévisions clients</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir les prévisions clients.</p>
          </div>
        </header>
        <Card><Link to="/clients"><Button>← Retour</Button></Link></Card>
      </div>
    );
  }

  const forecast = clientsState?.forecast;
  const scenario = forecast?.scenarios?.[activeScenario];

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Relation client</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Prévisions clients</h1>
          <p className="mt-1 text-sm text-slate-500">
            Projection 30 jours -- satisfaction, fidélité et note clients.
          </p>
        </div>
        <Link to="/clients"><Button variant="outline">← Tableau de bord</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {isRunning && !clientsState ? (
        <Card><p className="text-sm text-slate-500">Chargement des prévisions…</p></Card>
      ) : !forecast ? (
        <Card><p className="text-sm text-slate-500">Jouez un cycle pour générer les prévisions clients.</p></Card>
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
                <KpiCard label="Satisfaction moyenne" value={`${scenario.avgSatisfaction}/100`} />
                <KpiCard label="Satisfaction fin période" value={`${scenario.endSatisfaction}/100`} trend={scenario.endSatisfaction >= 60 ? undefined : -1} />
                <KpiCard label="Fidélité moyenne" value={`${scenario.avgLoyalty}/100`} />
                <KpiCard label="Note fin période" value={scenario.endRating ? `${scenario.endRating.toFixed(1)}/5` : "—"} />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <LineChart
                  title={`Prévision satisfaction — ${SCENARIO_LABELS[activeScenario]}`}
                  labels={scenario.days.map((d) => `J${d.day}`)}
                  data={scenario.days.map((d) => d.satisfaction)}
                />
                <LineChart
                  title={`Prévision fidélité — ${SCENARIO_LABELS[activeScenario]}`}
                  labels={scenario.days.map((d) => `J${d.day}`)}
                  data={scenario.days.map((d) => d.loyalty)}
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
