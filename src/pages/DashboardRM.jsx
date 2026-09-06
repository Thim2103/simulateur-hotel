import { useEffect, useState } from "react";
import { getRMStats } from "../lib/calculs/rm";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";

import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import PickupChart from "../components/charts/PickupChart";
import SegmentationChart from "../components/charts/SegmentationChart";
import RevenueRoomTypeChart from "../components/charts/RevenueRoomTypeChart";
import HeatmapOccupation from "../components/charts/HeatmapOccupation";
import RMFilters from "../components/rm/RMFilters";

export default function DashboardRM() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { kpis: restaurantKpis } = useRestaurantSimulator();
  const restaurantDemand = restaurantKpis.demand;
  const restaurantRevenue = restaurantKpis.totalMonthlyRevenue;
  const restaurantSatisfaction = restaurantKpis.customerSatisfaction;

  // 🔥 Filtres RM
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    roomType: "",
    segment: "",
    channel: "",
    status: ""
  });

  // 🔥 Recalcul des stats à chaque changement de filtre
  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      setError(null);
      try {
        const data = await getRMStats(filters, {
          demand: restaurantDemand,
          totalMonthlyRevenue: restaurantRevenue,
          customerSatisfaction: restaurantSatisfaction,
        });
        setStats(data);
      } catch (err) {
        console.error("Erreur RM :", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [filters, restaurantDemand, restaurantRevenue, restaurantSatisfaction]);

  if (loading) {
    return <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">Chargement des KPIs…</div>;
  }
  if (error) return <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Impossible de charger les indicateurs RM : {error.message}</div>;
  if (!stats) return <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Aucune donnée RM disponible pour ces filtres.</div>;

  return (
    <div className="flex flex-col gap-6">
      <header className="page-header">
        <div>
          <p className="eyebrow">Revenue management</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Pilotage de la performance</h1>
          <p className="mt-1 text-sm text-slate-500">Une lecture claire de la demande, des revenus et du potentiel à venir.</p>
        </div>
      </header>

      <RMFilters filters={filters} setFilters={setFilters} />

      <section aria-labelledby="rm-kpis" className="flex flex-col gap-3">
        <h2 id="rm-kpis" className="text-base font-semibold text-slate-900">Indicateurs clés</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          label="Occupation"
          value={`${(stats?.kpis?.occupancy ?? 0).toFixed(1)} %`}
          trend={(stats?.kpis?.occupancy ?? 0) > 70 ? 3.2 : -1.1}
        />

        <KpiCard
          label="ADR"
          value={`${(stats?.kpis?.adr ?? 0).toFixed(2)} €`}
          trend={(stats?.kpis?.adr ?? 0) > 100 ? 2.8 : -0.5}
        />

        <KpiCard
          label="RevPAR"
          value={`${(stats?.kpis?.revpar ?? 0).toFixed(2)} €`}
          trend={(stats?.kpis?.revpar ?? 0) > 80 ? 4.1 : -2.3}
        />

        <KpiCard
          label="Revenu total"
          value={`${(stats?.revenue ?? 0).toFixed(0)} €`}
          trend={(stats?.revenue ?? 0) > 10000 ? 5.4 : -3.2}
        />

        <KpiCard
          label="Prévision"
          value={stats?.forecast?.next30 == null ? "À venir" : `${stats.forecast.next30.toFixed(0)} €`}
          trend={(stats?.forecastAdvanced?.next30 ?? 0) > (stats?.revenue ?? 0) ? 4.8 : -2.1}
        />

        <KpiCard
          label="Demande restaurant"
          value={`${(stats?.restaurantDemand ?? 0).toFixed(0)} %`}
          trend={(stats?.restaurantDemand ?? 0) > 70 ? 3.5 : -1.2}
        />
        <KpiCard
          label="Revenu restaurant"
          value={`${(stats?.restaurantRevenue ?? 0).toFixed(0)} €`}
          trend={(stats?.restaurantRevenue ?? 0) > 30000 ? 4.2 : -1.4}
        />
        <KpiCard
          label="Satisfaction restaurant"
          value={`${(stats?.restaurantSatisfaction ?? 0).toFixed(1)} / 5`}
          trend={(stats?.restaurantSatisfaction ?? 0) >= 4 ? 3.1 : -2.2}
        />
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Prévision 90 jours" value={stats?.forecast?.next90 == null ? "À venir" : `${stats.forecast.next90.toFixed(0)} €`} trend={2.6} />
        <KpiCard label="Demande combinée" value={`${(stats?.combinedDemand ?? 0).toFixed(0)} %`} trend={2.1} />
        <KpiCard label="RevPASH restaurant" value={`${(stats?.revpash ?? 0).toFixed(2)} €`} trend={1.4} />
      </div>
      </section>

      <section aria-labelledby="rm-analysis" className="flex flex-col gap-4">
        <h2 id="rm-analysis" className="text-base font-semibold text-slate-900">Analyse commerciale</h2>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PickupChart pickup={stats.pickup} pickupCurve={stats.pickupCurve} />
          <SegmentationChart segmentation={stats.segmentation} />
          <RevenueRoomTypeChart revenueByRoomType={stats.revenueByRoomType} />
          <HeatmapOccupation heatmap={stats.heatmap} />

          <div className="bg-white p-4 rounded-xl shadow">
            <h3 className="text-lg font-semibold mb-3">Yield par canal</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.channelYield || {}).map(([channel, values]) => (
                <div key={channel} className="border rounded-lg p-3">
                  <div className="font-semibold capitalize">{channel}</div>
                  <div className="text-sm text-gray-600">ADR {values.adr} €</div>
                  <div className="text-sm text-gray-600">Prix conseillé {values.recommendedAdr} €</div>
                  <div className="text-sm text-gray-600">Net {values.netRevenue} €</div>
                  <div className="text-xs uppercase mt-2">{values.yield}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <LineChart
          title="KPIs RM depuis Supabase"
          labels={["Occupation", "ADR", "RevPAR"]}
          data={[
            stats?.kpis?.occupancy ?? 0,
            stats?.kpis?.adr ?? 0,
            stats?.kpis?.revpar ?? 0,
          ]}
        />
        <BarChart
          title="Revenus par département"
          labels={["Chambres", "Restaurant", "Spa", "Bar"]}
          data={[
            stats?.revenue ?? 0,
            stats?.restaurantRevenue ?? 0,
            (stats?.revenue ?? 0) * 0.15,
            (stats?.revenue ?? 0) * 0.10,
          ]}
        />
      </div>
    </div>
  );
}
