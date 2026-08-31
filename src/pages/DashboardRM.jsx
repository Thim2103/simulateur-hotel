import { useEffect, useState } from "react";
import { getRMStats } from "../lib/calculs/rm";

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
      try {
        const data = await getRMStats(filters);
        setStats(data);
      } catch (err) {
        console.error("Erreur RM :", err);
      }
      setLoading(false);
    }

    loadStats();
  }, [filters]);

  if (loading || !stats) {
    return <div className="p-6">Chargement des KPIs…</div>;
  }

  return (
    <div className="p-6 flex flex-col gap-6">

      {/* 🔥 Filtres RM */}
      <RMFilters filters={filters} setFilters={setFilters} />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KpiCard
          label="Occupation"
          value={`${(stats?.occupancy ?? 0).toFixed(1)} %`}
          trend={(stats?.occupancy ?? 0) > 70 ? 3.2 : -1.1}
        />

        <KpiCard
          label="ADR"
          value={`${(stats?.adr ?? 0).toFixed(2)} €`}
          trend={(stats?.adr ?? 0) > 100 ? 2.8 : -0.5}
        />

        <KpiCard
          label="RevPAR"
          value={`${(stats?.revpar ?? 0).toFixed(2)} €`}
          trend={(stats?.revpar ?? 0) > 80 ? 4.1 : -2.3}
        />

        <KpiCard
          label="Revenu total"
          value={`${(stats?.revenue ?? 0).toFixed(0)} €`}
          trend={(stats?.revenue ?? 0) > 10000 ? 5.4 : -3.2}
        />

        <KpiCard
          label="Prévision"
          value={`${(stats?.forecastAdvanced?.next30 ?? 0).toFixed(0)} €`}
          trend={(stats?.forecastAdvanced?.next30 ?? 0) > (stats?.revenue ?? 0) ? 4.8 : -2.1}
        />
      </div>

      {/* Graphiques RM */}
      <PickupChart pickup={stats.pickup} />
      <SegmentationChart segmentation={stats.segmentation} />
      <RevenueRoomTypeChart revenueByRoomType={stats.revenueByRoomType} />
      <HeatmapOccupation heatmap={stats.heatmap} />

      {/* Graphique d’occupation */}
      <LineChart
        title="Occupation (7 derniers jours)"
        labels={["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]}
        data={[55, 62, 70, 75, 80, 78, stats?.occupancy ?? 0]}
      />

      {/* Graphique des revenus */}
      <BarChart
        title="Revenus par département"
        labels={["Chambres", "Restaurant", "Spa", "Bar"]}
        data={[
          stats?.revenue ?? 0,
          (stats?.revenue ?? 0) * 0.25,
          (stats?.revenue ?? 0) * 0.15,
          (stats?.revenue ?? 0) * 0.10,
        ]}
      />
    </div>
  );
}
