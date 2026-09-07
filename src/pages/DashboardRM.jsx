import { useEffect, useState } from "react";
import { getRMStats } from "../lib/calculs/rm";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";
import { useHotelSimulator } from "../hooks/useHotelSimulator";

import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import PickupChart from "../components/charts/PickupChart";
import SegmentationChart from "../components/charts/SegmentationChart";
import RevenueRoomTypeChart from "../components/charts/RevenueRoomTypeChart";
import HeatmapOccupation from "../components/charts/HeatmapOccupation";
import RMFilters from "../components/rm/RMFilters";
import Card from "../components/ui/Card";

export default function DashboardRM() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { kpis: restaurantKpis } = useRestaurantSimulator();
  const { kpis: hotelKpis } = useHotelSimulator();
  const restaurantDemand = restaurantKpis.demand;
  const restaurantRevenue = restaurantKpis.totalMonthlyRevenue;
  const restaurantSatisfaction = restaurantKpis.customerSatisfaction;
  const hotelMarketingReach = hotelKpis.marketingReach;
  const hotelSustainabilityScore = hotelKpis.sustainabilityScore;

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
        const data = await getRMStats(
          filters,
          {
            demand: restaurantDemand,
            totalMonthlyRevenue: restaurantRevenue,
            customerSatisfaction: restaurantSatisfaction,
          },
          {
            marketingReach: hotelMarketingReach,
            sustainabilityScore: hotelSustainabilityScore,
          }
        );
        setStats(data);
      } catch (err) {
        console.error("Erreur RM :", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [filters, restaurantDemand, restaurantRevenue, restaurantSatisfaction, hotelMarketingReach, hotelSustainabilityScore]);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Rythme des réservations" value={`${stats?.bookingPace?.averagePerDay ?? 0} / jour`} trend={stats?.pickupTrend === "up" ? 2.4 : stats?.pickupTrend === "down" ? -2.4 : 0} />
        <KpiCard label="Tendance pick-up" value={stats?.pickupTrend === "up" ? "Hausse" : stats?.pickupTrend === "down" ? "Baisse" : "Stable"} trend={stats?.pickupTrend === "up" ? 1.8 : stats?.pickupTrend === "down" ? -1.8 : 0} />
        <KpiCard label="ADR mix pondéré" value={`${(stats?.segmentMixImpact?.blendedAdr ?? 0).toFixed(0)} €`} trend={1.2} />
      </div>
      </section>

      <section aria-labelledby="rm-analysis" className="flex flex-col gap-4">
        <h2 id="rm-analysis" className="text-base font-semibold text-slate-900">Analyse commerciale</h2>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PickupChart pickup={stats.pickup} pickupCurve={stats.pickupCurve} />
          <SegmentationChart segmentation={stats.segmentation} />
          <RevenueRoomTypeChart revenueByRoomType={stats.revenueByRoomType} />
          <HeatmapOccupation heatmap={stats.heatmap} />

          <Card title="Yield par canal">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.channelYield || {}).map(([channel, values]) => (
                <div key={channel} className="rounded-lg border border-slate-200 p-3 transition-colors duration-150 hover:border-slate-300">
                  <div className="font-semibold capitalize text-slate-900">{channel}</div>
                  <div className="text-sm text-slate-500">ADR {values.adr} €</div>
                  <div className="text-sm text-slate-500">BAR {values.barRate} €</div>
                  <div className="text-sm text-slate-500">Tarif stratégie {values.strategyRate} €</div>
                  <div className="text-sm text-slate-500">Prix dynamique {values.dynamicRate} €</div>
                  <div className="text-sm text-slate-500">Net {values.netRevenue} €</div>
                  <div className="mt-2 text-xs uppercase text-slate-500">{values.yield}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Impact du mix segments sur l'ADR">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.segmentMixImpact?.bySegment || {}).map(([segment, values]) => (
                <div key={segment} className="rounded-lg border border-slate-200 p-3 transition-colors duration-150 hover:border-slate-300">
                  <div className="font-semibold capitalize text-slate-900">{segment}</div>
                  <div className="text-sm text-slate-500">Part du mix {values.mixShare}%</div>
                  <div className="text-sm text-slate-500">ADR {values.adr} €</div>
                  <div className={`mt-2 text-xs ${values.adrDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{values.adrDelta >= 0 ? "+" : ""}{values.adrDelta}% vs ADR moyen</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <LineChart
          title="Courbe de demande (prévision 30 jours)"
          labels={(stats?.forecast?.daily30 ?? []).map((point) => point.date.slice(5))}
          data={(stats?.forecast?.daily30 ?? []).map((point) => point.value)}
        />
        <LineChart
          title="Occupation quotidienne (feed PMS)"
          labels={(stats?.dailyOccupancy ?? []).map((point) => point.date.slice(5))}
          data={(stats?.dailyOccupancy ?? []).map((point) => point.occupancy)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
