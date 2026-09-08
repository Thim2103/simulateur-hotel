import KpiCard from "../charts/KpiCard";
import { pricingKpiForMode } from "../../lib/dashboard/dashboardViewMode";

// The 5 headline KPIs: occupation, prix moyen (casual) / ADR (expert),
// revenu du jour, satisfaction, personnel -- see
// lib/dashboard/dashboardEngine.js's computeKpis().
export default function DashboardKpis({ kpis, viewMode }) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <KpiCard key={i} label="—" value="—" loading />
        ))}
      </div>
    );
  }

  const pricing = pricingKpiForMode(viewMode, kpis);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard label="Taux d'occupation" value={`${kpis.occupancyRate}%`} />
      <KpiCard label={pricing.label} value={`${pricing.value} €`} />
      <KpiCard label="Revenu du jour" value={`${kpis.revenueToday.toLocaleString()} €`} trend={kpis.profit >= 0 ? undefined : -1} />
      <KpiCard label="Satisfaction" value={kpis.satisfaction === null ? "—" : `${kpis.satisfaction.toFixed(1)}/5`} />
      <KpiCard label="Personnel" value={`${kpis.staffCount}`} />
    </div>
  );
}
