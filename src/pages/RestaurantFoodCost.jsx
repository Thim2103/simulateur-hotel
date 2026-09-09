import { useEffect } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import KpiCard from "../components/charts/KpiCard";
import BarChart from "../components/charts/BarChart";
import { useCareerContext } from "../context/CareerContext";
import { useRestaurantAdvanced } from "../hooks/useRestaurantAdvanced";

// Route: /restaurant/food-cost -- dynamic food cost: overall %, per
// category, waste share and supplier volatility, plus the items eating
// the most into their own price. Built on the same
// useRestaurantAdvanced.js as RestaurantMenuEngineering.jsx.
export default function RestaurantFoodCost() {
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
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Food Cost</h1>
            <p className="mt-1 text-sm text-slate-500">Démarrez votre carrière pour voir le food cost.</p>
          </div>
        </header>
        <Card><Link to="/restaurant/menu-engineering"><Button>← Retour</Button></Link></Card>
      </div>
    );
  }

  const foodCost = restaurantAdvancedState?.foodCost || { overall: null, byCategory: {}, wastePct: null, volatilityIndex: null };
  const menuItemsFlagged = restaurantAdvancedState?.menuEngineering?.items?.filter((item) => {
    const category = foodCost.byCategory[item.category];
    return category !== null && category !== undefined && category > 35;
  }) || [];

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Restaurant avancé</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Food Cost</h1>
          <p className="mt-1 text-sm text-slate-500">
            Coût matières, gaspillage et volatilité fournisseurs -- jour {careerState.day}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/restaurant/menu-engineering"><Button variant="outline">← Menu Engineering</Button></Link>
        </div>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Une erreur est survenue : {error.message}</div>}

      {!restaurantAdvancedState ? (
        <Card><p className="text-sm text-slate-500">Chargement du food cost…</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Food cost global" value={foodCost.overall !== null ? `${foodCost.overall}%` : "—"} trend={foodCost.overall > 32 ? -1 : undefined} />
            <KpiCard label="Gaspillage" value={foodCost.wastePct !== null ? `${foodCost.wastePct}%` : "—"} trend={foodCost.wastePct > 55 ? -1 : undefined} />
            <KpiCard label="Volatilité fournisseurs" value={foodCost.volatilityIndex !== null ? `${foodCost.volatilityIndex}/100` : "—"} />
            <KpiCard label="Catégories suivies" value={`${Object.keys(foodCost.byCategory).length}`} />
          </div>

          {Object.keys(foodCost.byCategory).length > 0 && (
            <BarChart
              title="Food cost par catégorie"
              labels={Object.keys(foodCost.byCategory)}
              data={Object.values(foodCost.byCategory).map((v) => v ?? 0)}
            />
          )}

          {menuItemsFlagged.length > 0 && (
            <Card title="Plats à food cost élevé">
              <ul className="flex flex-col gap-2 text-sm">
                {menuItemsFlagged.map((item) => (
                  <li key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 p-2">{item.name} ({item.category})</li>
                ))}
              </ul>
            </Card>
          )}

          <section aria-labelledby="foodcost-actions" className="flex flex-col gap-3">
            <h2 id="foodcost-actions" className="text-base font-semibold text-slate-900">Actions food cost</h2>
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" onClick={() => applyRestaurantAction("reduire-pertes")} disabled={isRunning}>
                  Réduire les pertes
                </Button>
                <Button variant="outline" onClick={() => applyRestaurantAction("renegocier-fournisseurs")} disabled={isRunning}>
                  Renégocier les fournisseurs
                </Button>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Réduire les pertes limite le gaspillage. Renégocier les fournisseurs stabilise la volatilité des coûts matières.
              </p>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
