import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import BarChart from "../components/charts/BarChart";
import { useCareerContext } from "../context/CareerContext";
import { useRestaurantAdvanced } from "../hooks/useRestaurantAdvanced";

// Route: /restaurant/profitability -- per-dish margin, gross/net margin,
// top/bottom performers, plus the "repositionner les prix" action. Built
// on the same useRestaurantAdvanced.js as RestaurantMenuEngineering.jsx.
export default function RestaurantProfitability() {
  const { careerState, isRunning: isCareerRunning } = useCareerContext();
  const { restaurantAdvancedState, isRunning: isRestaurantRunning, error, loadRestaurantAdvancedState, applyRestaurantAction } = useRestaurantAdvanced();

  useEffect(() => {
    loadRestaurantAdvancedState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRunning = isCareerRunning || isRestaurantRunning;

  if (!careerState) {
    return (
      <div className="flex flex-col gap-6">
        <header className="page-header">
          <div>
            <p className="eyebrow">Restaurant avancé</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rentabilité</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir la rentabilité de la carte.</p>
          </div>
        </header>
        <Card><Link to="/restaurant/menu-engineering"><Button>← Retour</Button></Link></Card>
      </div>
    );
  }

  const profitability = restaurantAdvancedState?.profitability || { items: [], grossMargin: null, netMargin: null, topMargin: [], bottomMargin: [] };

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Restaurant avancé</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Rentabilité</h1>
          <p className="mt-1 text-sm text-slate-500">
            Marge par plat et rentabilité de la carte -- jour {careerState.day}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/restaurant/menu-engineering"><Button variant="outline">← Menu Engineering</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!restaurantAdvancedState ? (
        <Card><p className="text-sm text-slate-500">Chargement de la rentabilité…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
            <KpiCard label="Marge brute" value={profitability.grossMargin !== null ? `${profitability.grossMargin}%` : "—"} trend={profitability.grossMargin < 55 ? -1 : undefined} />
            <KpiCard label="Marge nette" value={profitability.netMargin !== null ? `${profitability.netMargin}%` : "—"} trend={profitability.netMargin < 15 ? -1 : undefined} />
          </div>

          {profitability.items.length > 0 && (
            <BarChart
              title="Marge par plat (%)"
              labels={profitability.items.map((item) => item.name)}
              data={profitability.items.map((item) => item.marginPct)}
            />
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card title="Meilleures marges">
              <ul className="flex flex-col gap-2 text-sm">
                {profitability.topMargin.map((item) => (
                  <li key={item.id} className="flex justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                    <span>{item.name}</span><span className="font-medium">{item.marginPct}%</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Marges les plus faibles">
              <ul className="flex flex-col gap-2 text-sm">
                {profitability.bottomMargin.map((item) => (
                  <li key={item.id} className="flex justify-between rounded-lg border border-rose-200 bg-rose-50 p-2">
                    <span>{item.name}</span><span className="font-medium">{item.marginPct}%</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <section aria-labelledby="profitability-actions" className="flex flex-col gap-3">
            <h2 id="profitability-actions" className="text-base font-semibold text-slate-900">Action rentabilité</h2>
            <Card>
              <Button variant="outline" onClick={() => applyRestaurantAction("repositionner-prix")} disabled={isRunning}>
                Repositionner les prix
              </Button>
              <p className="mt-3 text-xs text-slate-500">
                Ajustement tarifaire ciblé sur les plats à faible marge : améliore la marge brute et nette globale.
              </p>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
