import KpiCard from "../charts/KpiCard";
import { pricingKpiForMode } from "../../lib/dashboard/dashboardViewMode";

// The headline KPIs: occupation, prix moyen (casual) / ADR (expert),
// revenu du jour, satisfaction, personnel, EBITDA, moral RH, ROI
// marketing, score ESG, qualité housekeeping, score TFE -- see
// lib/dashboard/dashboardEngine.js's computeKpis(), which now also folds
// in lib/finance/financeEngine.js's own income statement for the EBITDA
// figure ("afficher KPI financiers dans DashboardKpis.jsx", see the
// Refonte Finance request's section 5), lib/staff/staffEngine.js's own
// HR cycle for the moral figure ("afficher moral / productivité /
// payroll dans DashboardKpis.jsx", see the Refonte RH request's section
// 5), lib/marketing/marketingEngine.js's own cycle for the ROI figure
// ("afficher KPI marketing dans DashboardKpis.jsx", see the Refonte
// Marketing request's section 5), lib/esg/esgEngine.js's own cycle for
// the score figure ("afficher KPI ESG dans DashboardKpis.jsx", see the
// Refonte ESG request's section 5), and
// lib/housekeeping/housekeepingEngine.js's own cycle for the quality
// figure ("afficher KPI HK dans DashboardKpis.jsx", see the Refonte
// Housekeeping request's section 5). kpis.tfeScore is the odd one out:
// unlike every figure above (all derived from the same shared
// CareerState this Dashboard already shows), a TFE Solo run is its own
// self-contained playthrough (see lib/tfe/tfeState.js's header comment)
// -- pages/Dashboard.jsx reads it separately via hooks/useTfeEngine.js
// and merges it into the `kpis` object passed here, so this component
// itself stays agnostic to where each figure came from.
export default function DashboardKpis({ kpis, viewMode }) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 lg:grid-cols-11">
        {Array.from({ length: 11 }, (_, i) => (
          <KpiCard key={i} label="—" value="—" loading />
        ))}
      </div>
    );
  }

  const pricing = pricingKpiForMode(viewMode, kpis);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 lg:grid-cols-11">
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
    </div>
  );
}
