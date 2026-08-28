import { useEffect, useState } from "react";
import { getRMStats } from "../lib/calculs/rm";
import KpiCard from "../components/charts/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";

export default function DashboardRM() {
  const [stats, setStats] = useState({
    occupancy: 0,
    adr: 0,
    revpar: 0,
    revenue: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getRMStats();
        setStats(data);
      } catch (err) {
        console.error("Erreur RM :", err);
      }
      setLoading(false);
    }

    loadStats();
  }, []);

  if (loading) {
    return <div className="p-6">Chargement des KPIs…</div>;
  }

  return (
    <div className="p-6 flex flex-col gap-6">

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          label="Occupation"
          value={`${stats.occupancy.toFixed(1)} %`}
          trend={stats.occupancy > 70 ? 3.2 : -1.1}
        />
        <KpiCard
          label="ADR"
          value={`${stats.adr.toFixed(2)} €`}
          trend={stats.adr > 100 ? 2.8 : -0.5}
        />
        <KpiCard
          label="RevPAR"
          value={`${stats.revpar.toFixed(2)} €`}
          trend={stats.revpar > 80 ? 4.1 : -2.3}
        />
        <KpiCard
          label="Revenu total"
          value={`${stats.revenue.toFixed(0)} €`}
          trend={stats.revenue > 10000 ? 5.4 : -3.2}
        />
      </div>

      {/* Graphique d’occupation */}
      <LineChart
        title="Occupation (7 derniers jours)"
        labels={["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]}
        data={[55, 62, 70, 75, 80, 78, stats.occupancy]}
      />

      {/* Graphique des revenus */}
      <BarChart
        title="Revenus par département"
        labels={["Chambres", "Restaurant", "Spa", "Bar"]}
        data={[
          stats.revenue,
          stats.revenue * 0.25,
          stats.revenue * 0.15,
          stats.revenue * 0.10,
        ]}
      />
    </div>
  );
}
