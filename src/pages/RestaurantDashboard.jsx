import { useEffect } from "react";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useRestaurant } from "../hooks/useRestaurant";

const CATEGORIES = ["Plat", "Entrée", "Dessert", "Boisson"];

// Reads the real restaurant state (no offline mode, no mocked KPIs). The
// authoritative day-by-day simulation is runDailyCycle() (see
// hooks/useDailyCycle.js, driven from the main Dashboard) -- this page
// shows its results and lets the player recompute a preview of the
// restaurant's own operations metrics (lib/restaurant/restaurantEngine.js)
// after editing menu/staff on the other tabs, without running a second,
// competing day-advance loop.
export default function RestaurantDashboard() {
  const { restaurantState, restaurantReport, loading, error, loadRestaurantState, runRestaurantCycle } = useRestaurant();

  useEffect(() => {
    loadRestaurantState().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !restaurantState) {
    return (
      <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          Chargement des données restaurant…
        </span>
      </div>
    );
  }

  if (error && !restaurantState) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Impossible de charger les données restaurant : {error.message}
      </div>
    );
  }

  const finance = restaurantState?.finance || {};
  const menu = restaurantState?.menu || [];
  const monthLabels = Array.isArray(finance.months) ? finance.months : Object.keys(finance.months || {});
  const revenueSeries = Array.isArray(finance.revenue) ? finance.revenue : Object.values(finance.revenue || {});

  const menuRevenue = menu.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.sales || 0), 0);
  const categoryMix = CATEGORIES.map((category) => menu.filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.sales || 0), 0));

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Restaurant simulator</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Tableau de bord opérationnel</h1>
          <p className="mt-1 text-sm text-slate-500">Suivez l'activité, la rentabilité et la qualité de service de votre établissement.</p>
        </div>
        {restaurantReport && <div className="rounded-lg bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">{restaurantReport.date}</div>}
      </header>

      <Card className="border-cyan-100 bg-gradient-to-br from-white to-cyan-50/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow">Aperçu opérationnel</p>
            <p className="mt-1 text-xl font-bold text-slate-900">Basé sur l'état réel de l'établissement</p>
            <p className="mt-1 text-sm text-slate-500">
              Le cycle quotidien avance depuis le tableau de bord de l'hôtel. Recalculez ici un aperçu à jour après une modification du menu ou de l'équipe.
            </p>
          </div>
          <Button onClick={() => runRestaurantCycle({ events: [] })}>Recalculer l'aperçu</Button>
        </div>
      </Card>

      {!restaurantReport ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Cliquez sur « Recalculer l'aperçu » pour générer les indicateurs opérationnels.
        </div>
      ) : (
        <>
          <section aria-labelledby="restaurant-kpis" className="flex flex-col gap-3">
            <h2 id="restaurant-kpis" className="text-base font-semibold text-slate-900">Indicateurs clés</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Ticket moyen" value={`${restaurantReport.finance.avgTicket.toFixed(2)} €`} />
              <KpiCard label="Marge brute" value={`${restaurantReport.finance.grossMargin.toLocaleString()} €`} />
              <KpiCard label="Profit estimé" value={`${restaurantReport.finance.estimatedProfit.toLocaleString()} €`} />
              <KpiCard label="Effectif" value={restaurantReport.staff.headcount} />
            </div>
          </section>

          <section aria-labelledby="restaurant-performance" className="flex flex-col gap-3">
            <h2 id="restaurant-performance" className="text-base font-semibold text-slate-900">Performance de l'établissement</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Demande" value={`${restaurantReport.demand}%`} />
              <KpiCard label="Productivité RH" value={`${restaurantReport.staff.productivity}%`} />
              <KpiCard label="Satisfaction" value={`${restaurantReport.customerSatisfaction.toFixed(2)}/5`} />
              <KpiCard label="Popularité menu" value={`${restaurantReport.menu.popularity}%`} />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LineChart title="Évolution du chiffre d'affaires" labels={monthLabels} data={revenueSeries} />
            <BarChart title="Mix produits" labels={["Plats", "Entrées", "Desserts", "Boissons"]} data={categoryMix} />
          </div>

          <section aria-labelledby="restaurant-alerts" className="flex flex-col gap-3">
            <h2 id="restaurant-alerts" className="text-base font-semibold text-slate-900">Points de vigilance</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Heures de pointe" value={restaurantReport.rushHour} />
              <KpiCard label="Réclamations" value={`${restaurantReport.complaints}`} />
              <KpiCard label="Maintenance" value={`${restaurantReport.maintenanceRisk}%`} />
              <KpiCard label="Revenu menu estimé" value={`${Math.round(menuRevenue).toLocaleString()} €`} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
