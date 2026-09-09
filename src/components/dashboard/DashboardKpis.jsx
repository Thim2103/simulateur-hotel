import KpiCard from "../charts/KpiCard";
import { pricingKpiForMode } from "../../lib/dashboard/dashboardViewMode";

// The headline KPIs: occupation, prix moyen (casual) / ADR (expert),
// revenu du jour, satisfaction, personnel, EBITDA, moral RH, ROI
// marketing, score ESG, qualité housekeeping, score TFE, satisfaction
// clients -- see lib/dashboard/dashboardEngine.js's computeKpis().
// kpis.tfeScore and kpis.clientsSatisfaction are the two "odd ones out":
// unlike figures derived from the shared CareerState, TFE is its own
// self-contained playthrough and Clients reads independently via
// hooks/useTfeEngine.js and hooks/useClientsEngine.js respectively --
// pages/Dashboard.jsx merges them into the `kpis` object here, so this
// component stays agnostic to where each figure came from.
export default function DashboardKpis({ kpis, viewMode }) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 lg:grid-cols-12">
        {Array.from({ length: 12 }, (_, i) => (
          <KpiCard key={i} label="—" value="—" loading />
        ))}
      </div>
    );
  }

  const pricing = pricingKpiForMode(viewMode, kpis);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 lg:grid-cols-12">
      <KpiCard label="Taux d'occupation" value={`${kpis.occupancyRate}%`} />
      <KpiCard label={pricing.label} value={`${pricing.value} €`} />
      <KpiCard label="Revenu du jour" value={`${kpis.revenueToday.toLocaleString()} €`} trend={kpis.profit >= 0 ? undefined : -1} />
      <KpiCard label="Satisfaction" value={kpis.satisfaction === null ? "—" : `${kpis.satisfaction.toFixed(1)}/5`} />
      <KpiCard label="Personnel" value={`${kpis.staffCount}`} />
      <KpiCard label="EBITDA" value={kpis.ebitda === null || kpis.ebitda === undefined ? "—" : `${kpis.ebitda.toLocaleString()} €`} trend={kpis.ebitda >= 0 ? undefined : -1} />
      <KpiCard label="Moral RH" value={kpis.staffMorale === null || kpis.staffMorale === undefined ? "—" : `${kpis.staffMorale}/100`} trend={kpis.staffMorale >= 55 ? undefined : -1} />
      <KpiCard label="ROI Marketing" value={kpis.marketingRoi === null || kpis.marketingRoi === undefined ? "—" : `${kpis.marketingRoi}x`} trend={kpis.marketingRoi >= 1 ? undefined : -1} />
      <KpiCard label="Score ESG" value={kpis.esgScore === null || kpis.esgScore === undefined ? "—" : `${kpis.esgScore}/100`} trend={kpis.esgScore >= 55 ? undefined : -1} />
      <KpiCard label="Qualité HK" value={kpis.housekeepingQuality === null || kpis.housekeepingQuality === undefined ? "—" : `${kpis.housekeepingQuality}/100`} trend={kpis.housekeepingQuality >= 65 ? undefined : -1} />
      <KpiCard label="Score TFE" value={kpis.tfeScore === null || kpis.tfeScore === undefined ? "—" : `${kpis.tfeScore}/100`} trend={kpis.tfeScore >= 60 ? undefined : -1} />
      <KpiCard label="Satisfaction Clients" value={kpis.clientsSatisfaction === null || kpis.clientsSatisfaction === undefined ? "—" : `${kpis.clientsSatisfaction}/100`} trend={kpis.clientsSatisfaction >= 60 ? undefined : -1} />
    </div>
  );
}
