import KpiCard from "../charts/KpiCard";
import { pricingKpiForMode } from "../../lib/dashboard/dashboardViewMode";

// The headline KPIs: occupation, prix moyen (casual) / ADR (expert),
// revenu du jour, satisfaction, personnel, EBITDA -- see
// lib/dashboard/dashboardEngine.js's computeKpis(), which now also folds
// in lib/finance/financeEngine.js's own income statement for the EBITDA
// figure ("afficher KPI financiers dans DashboardKpis.jsx", see the
// Refonte Finance request's section 5).
export default function DashboardKpis({ kpis, viewMode }) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <KpiCard key={i} label="—" value="—" loading />
        ))}
      </div>
    );
  }

  const pricing = pricingKpiForMode(viewMode, kpis);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard label="Taux d'occupation" value={`${kpis.occupancyRate}%`} />
      <KpiCard label={pricing.label} value={`${pricing.value} €`} />
      <KpiCard label="Revenu du jour" value={`${kpis.revenueToday.toLocaleString()} €`} trend={kpis.profit >= 0 ? undefined : -1} />
      <KpiCard label="Satisfaction" value={kpis.satisfaction === null ? "—" : `${kpis.satisfaction.toFixed(1)}/5`} />
      <KpiCard label="Personnel" value={`${kpis.staffCount}`} />
      <KpiCard label="EBITDA" value={kpis.ebitda === null || kpis.ebitda === undefined ? "—" : `${kpis.ebitda.toLocaleString()} €`} trend={kpis.ebitda >= 0 ? undefined : -1} />
    </div>
  );
}
