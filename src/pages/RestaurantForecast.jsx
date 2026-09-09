import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import { useCareerContext } from "../context/CareerContext";
import { useRestaurantAdvanced } from "../hooks/useRestaurantAdvanced";

const SCENARIO_LABELS = { optimiste: "Optimiste", realiste: "Réaliste", pessimiste: "Pessimiste" };

// Route: /restaurant/forecast -- 30-day F&B forecast, three scenarios
// (optimiste/réaliste/pessimiste), built on useRestaurantAdvanced.js.
export default function RestaurantForecast() {
  const { careerState } = useCareerContext();
  const { restaurantAdvancedState, isRunning, error, loadRestaurantAdvancedState } = useRestaurantAdvanced();
  const [activeScenario, setActiveScenario] = useState("realiste");

  useEffect(() => {
    loadRestaurantAdvancedState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Restaurant avancé</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Prévisions F&amp;B</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir les prévisions F&amp;B.</p>
          </div>
        </header>
        <Card><Link to="/restaurant/menu-engineering"><Button>← Retour</Button></Link></Card>
      </div>
    );
  }

  const forecast = restaurantAdvancedState?.forecast;
  const scenario = forecast?.scenarios?.[activeScenario];

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Restaurant avancé</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Prévisions F&amp;B</h1>
          <p className="mt-1 text-sm text-slate-500">
            Projection 30 jours -- food cost, marge et popularité.
          </p>
        </div>
        <Link to="/restaurant/menu-engineering"><Button variant="outline">← Menu Engineering</Button></Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {isRunning && !restaurantAdvancedState ? (
        <Card><p className="text-sm text-slate-500">Chargement des prévisions…</p></Card>
      ) : !forecast ? (
        <Card><p className="text-sm text-slate-500">Jouez un cycle pour générer les prévisions F&amp;B.</p></Card>
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
                <KpiCard label="Food cost moyen" value={`${scenario.avgFoodCost}%`} />
                <KpiCard label="Food cost fin période" value={`${scenario.endFoodCost}%`} trend={scenario.endFoodCost > 32 ? -1 : undefined} />
                <KpiCard label="Marge brute moyenne" value={`${scenario.avgGrossMargin}%`} />
                <KpiCard label="Popularité fin période" value={`${scenario.endPopularity}/100`} />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <LineChart
                  title={`Prévision food cost — ${SCENARIO_LABELS[activeScenario]}`}
                  labels={scenario.days.map((d) => `J${d.day}`)}
                  data={scenario.days.map((d) => d.foodCost)}
                />
                <LineChart
                  title={`Prévision marge brute — ${SCENARIO_LABELS[activeScenario]}`}
                  labels={scenario.days.map((d) => `J${d.day}`)}
                  data={scenario.days.map((d) => d.grossMargin)}
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
