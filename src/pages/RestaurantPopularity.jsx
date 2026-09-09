import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import BarChart from "../components/charts/BarChart";
import { useCareerContext } from "../context/CareerContext";
import { useRestaurantAdvanced } from "../hooks/useRestaurantAdvanced";

// Route: /restaurant/popularity -- per-dish popularity, trending and
// declining items, plus the "campagne plats signature" action. Built on
// the same useRestaurantAdvanced.js as RestaurantMenuEngineering.jsx.
export default function RestaurantPopularity() {
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
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Popularité</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir la popularité des plats.</p>
          </div>
        </header>
        <Card><Link to="/restaurant/menu-engineering"><Button>← Retour</Button></Link></Card>
      </div>
    );
  }

  const popularity = restaurantAdvancedState?.popularity || { items: [], trending: [], declining: [] };
  const avgPopularity = popularity.items.length
    ? Math.round(popularity.items.reduce((sum, item) => sum + item.popularity, 0) / popularity.items.length)
    : null;
  const trendingItems = popularity.items.filter((item) => popularity.trending.includes(item.id));
  const decliningItems = popularity.items.filter((item) => popularity.declining.includes(item.id));

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Restaurant avancé</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Popularité</h1>
          <p className="mt-1 text-sm text-slate-500">
            Popularité des plats et tendances -- jour {careerState.day}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/restaurant/menu-engineering"><Button variant="outline">← Menu Engineering</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!restaurantAdvancedState ? (
        <Card><p className="text-sm text-slate-500">Chargement de la popularité…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Popularité moyenne" value={avgPopularity !== null ? `${avgPopularity}/100` : "—"} />
            <KpiCard label="Plats en hausse" value={`${trendingItems.length}`} />
            <KpiCard label="Plats en baisse" value={`${decliningItems.length}`} trend={decliningItems.length > 0 ? -1 : undefined} />
          </div>

          {popularity.items.length > 0 && (
            <BarChart
              title="Popularité par plat"
              labels={popularity.items.map((item) => item.name)}
              data={popularity.items.map((item) => item.popularity)}
            />
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card title="En hausse">
              {trendingItems.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun plat en hausse ce cycle.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {trendingItems.map((item) => (
                    <li key={item.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-2">{item.name} — {item.popularity}/100</li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="En baisse">
              {decliningItems.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun plat en baisse ce cycle.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {decliningItems.map((item) => (
                    <li key={item.id} className="rounded-lg border border-rose-200 bg-rose-50 p-2">{item.name} — {item.popularity}/100</li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <section aria-labelledby="popularity-actions" className="flex flex-col gap-3">
            <h2 id="popularity-actions" className="text-base font-semibold text-slate-900">Action popularité</h2>
            <Card>
              <Button variant="outline" onClick={() => applyRestaurantAction("campagne-plats-signature")} disabled={isRunning}>
                Campagne plats signature
              </Button>
              <p className="mt-3 text-xs text-slate-500">
                Met en avant les plats phares en salle et en marketing : booste leur popularité et la réputation de l'établissement.
              </p>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
