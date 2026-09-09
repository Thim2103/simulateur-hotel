import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import KpiCard from "../components/charts/KpiCard";
import BarChart from "../components/charts/BarChart";
import { useCareerContext } from "../context/CareerContext";
import { useRestaurantAdvanced } from "../hooks/useRestaurantAdvanced";
import { RESTAURANT_ACTION_CATALOG } from "../lib/restaurantAdvanced/restaurantAdvancedEngine";

const SEVERITY_BADGE = { high: "danger", medium: "warning", low: "info" };
const QUADRANT_LABEL = { star: "Star", plowhorse: "Plowhorse", puzzle: "Puzzle", dog: "Dog" };
const QUADRANT_BADGE = { star: "success", plowhorse: "warning", puzzle: "info", dog: "danger" };
const CATEGORY_LABEL = { menu: "Menu", foodcost: "Food Cost", profitability: "Rentabilité", popularity: "Popularité" };

// Route: /restaurant/menu-engineering -- the F&B module's own dashboard:
// the classic Menu Engineering matrix (Stars/Plowhorses/Puzzles/Dogs),
// diagnostics and the F&B actions catalog. Built on
// lib/restaurantAdvanced/restaurantAdvancedEngine.js and
// hooks/useRestaurantAdvanced.js, the same pattern
// pages/ClientsDashboard.jsx already established.
export default function RestaurantMenuEngineering() {
  const { careerState, isRunning: isCareerRunning, error: careerError, startCareer } = useCareerContext();
  const {
    restaurantAdvancedState,
    isRunning: isRestaurantRunning,
    error: restaurantError,
    loadRestaurantAdvancedState,
    applyRestaurantAction,
  } = useRestaurantAdvanced();

  useEffect(() => {
    loadRestaurantAdvancedState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = isCareerRunning || isRestaurantRunning;
  const error = restaurantError || careerError;

  const handleAction = async (actionId) => {
    try {
      await applyRestaurantAction(actionId);
    } catch {
      // error surfaced via `error`.
    }
  };

  if ((isCareerRunning || isRestaurantRunning) && !careerState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
          Chargement des données F&amp;B…
        </span>
      </div>
    );
  }

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Restaurant avancé</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Menu Engineering</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir vos indicateurs F&amp;B.</p>
          </div>
        </header>
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}
        <Card>
          <Button
            onClick={async () => {
              const newCareerState = await startCareer("moi").catch(() => null);
              await loadRestaurantAdvancedState(newCareerState).catch(() => undefined);
            }}
            disabled={isRunning}
          >
            {isRunning ? "Démarrage…" : "Démarrer ma carrière"}
          </Button>
        </Card>
      </div>
    );
  }

  const diagnostics = restaurantAdvancedState?.diagnostics || [];
  const engineering = restaurantAdvancedState?.menuEngineering || { items: [], counts: { stars: 0, plowhorses: 0, puzzles: 0, dogs: 0 } };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Restaurant avancé</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Menu Engineering</h1>
          <p className="mt-1 text-sm text-slate-500">
            Matrice popularité / rentabilité de la carte -- jour {careerState.day}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/restaurant/food-cost"><Button variant="outline">Food Cost</Button></Link>
          <Link to="/restaurant/popularity"><Button variant="outline">Popularité</Button></Link>
          <Link to="/restaurant/profitability"><Button variant="outline">Rentabilité</Button></Link>
          <Link to="/restaurant/forecast"><Button variant="outline">Forecast</Button></Link>
          <Link to="/restaurant/report"><Button variant="outline">Rapport</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!restaurantAdvancedState ? (
        <Card><p className="text-sm text-slate-500">Chargement du cycle F&amp;B…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Stars" value={`${engineering.counts.stars}`} />
            <KpiCard label="Plowhorses" value={`${engineering.counts.plowhorses}`} />
            <KpiCard label="Puzzles" value={`${engineering.counts.puzzles}`} />
            <KpiCard label="Dogs" value={`${engineering.counts.dogs}`} trend={engineering.counts.dogs > 0 ? -1 : undefined} />
          </div>

          <BarChart
            title="Répartition Menu Engineering"
            labels={["Stars", "Plowhorses", "Puzzles", "Dogs"]}
            data={[engineering.counts.stars, engineering.counts.plowhorses, engineering.counts.puzzles, engineering.counts.dogs]}
          />

          <Card title="Détail par plat">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-4">Plat</th>
                    <th className="pb-2 pr-4">Catégorie</th>
                    <th className="pb-2 pr-4">Popularité</th>
                    <th className="pb-2 pr-4">Profitabilité</th>
                    <th className="pb-2">Quadrant</th>
                  </tr>
                </thead>
                <tbody>
                  {engineering.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="py-1.5 pr-4 font-medium text-slate-900">{item.name}</td>
                      <td className="py-1.5 pr-4 text-slate-600">{item.category}</td>
                      <td className="py-1.5 pr-4 text-slate-700">{item.popularityIndex}</td>
                      <td className="py-1.5 pr-4 text-slate-700">{item.profitabilityIndex}</td>
                      <td className="py-1.5">
                        <Badge type={QUADRANT_BADGE[item.quadrant] || "info"}>{QUADRANT_LABEL[item.quadrant] || item.quadrant}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <section aria-labelledby="restaurant-diagnostics" className="flex flex-col gap-3">
            <h2 id="restaurant-diagnostics" className="text-base font-semibold text-slate-900">Diagnostics F&amp;B</h2>
            <Card>
              {diagnostics.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun diagnostic pour le moment.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {diagnostics.map((diag, index) => (
                    <li key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                      <span className="text-slate-700">{diag.message}</span>
                      <Badge type={SEVERITY_BADGE[diag.severity] || "info"}>{diag.severity}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section aria-labelledby="restaurant-actions" className="flex flex-col gap-3">
            <h2 id="restaurant-actions" className="text-base font-semibold text-slate-900">Actions F&amp;B</h2>
            <Card>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {RESTAURANT_ACTION_CATALOG.map((action) => (
                  <div key={action.id} className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{CATEGORY_LABEL[action.category] || action.category}</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{action.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                    </div>
                    <Button variant="outline" onClick={() => handleAction(action.id)} disabled={isRunning}>
                      Appliquer
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
