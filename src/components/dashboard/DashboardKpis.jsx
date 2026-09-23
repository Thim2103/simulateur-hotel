import KpiCard from "../charts/KpiCard";
import { pricingKpiForMode } from "../../lib/dashboard/dashboardViewMode";

// The headline KPIs: occupation, prix moyen (casual) / ADR (expert),
// revenu du jour, satisfaction, personnel, EBITDA, moral RH, ROI
// marketing, score ESG, qualité housekeeping, score TFE, satisfaction
// clients, mix RM avancé, score professionnel -- see
// lib/dashboard/dashboardEngine.js's computeKpis(). kpis.tfeScore,
// kpis.clientsSatisfaction, kpis.rmAdvancedMix and kpis.proScore are the
// "odd ones out": unlike figures derived from the shared CareerState,
// TFE and the Mode Professionnel Solo are each their own self-contained
// playthrough and Clients/RM Advanced each read independently via
// hooks/useTfeEngine.js/useClientsEngine.js/useRmAdvancedEngine.js/
// useProEngine.js respectively -- pages/Dashboard.jsx merges them into
// the `kpis` object here, so this component stays agnostic to where
// each figure came from.
// Mode Normal (see context/AppModeContext.jsx -- distinct from the
// casual/expert `viewMode` prop above, which only ever swaps a KPI
// label/value) shows just the 4 headline figures the redesign's "Premier
// Aperçu" spec calls for: Trésorerie, Occupation, Satisfaction,
// Réputation. Every other KPI stays computed in dashboardEngine.js and
// is simply not rendered here -- Mode Expert (the default) still shows
// all 14.
export default function DashboardKpis({ kpis, viewMode, appMode = "expert" }) {
  const cardCount = appMode === "normal" ? 4 : 14;
  if (!kpis) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 lg:grid-cols-12">
        {Array.from({ length: cardCount }, (_, i) => (
          <KpiCard key={i} label="—" value="—" loading />
        ))}
      </div>
    );
  }

  const pricing = pricingKpiForMode(viewMode, kpis);

  if (appMode === "normal") {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Trésorerie" value={kpis.cash === null || kpis.cash === undefined ? "—" : `${kpis.cash.toLocaleString()} €`} trend={kpis.cash >= 0 ? undefined : -1} />
        <KpiCard label="Occupation" value={`${kpis.occupancyRate}%`} />
        <KpiCard label="Satisfaction" value={kpis.satisfaction === null ? "—" : `${kpis.satisfaction.toFixed(1)}/5`} />
        <KpiCard label="Réputation" value={kpis.reputation === null || kpis.reputation === undefined ? "—" : `${kpis.reputation}/100`} trend={kpis.reputation >= 55 ? undefined : -1} />
      </div>
    );
  }

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
      <KpiCard label="Mix optimal RM" value={kpis.rmAdvancedMix === null || kpis.rmAdvancedMix === undefined ? "—" : `${kpis.rmAdvancedMix}%`} trend={kpis.rmAdvancedMix >= 40 ? undefined : -1} />
      <KpiCard label="Score Professionnel" value={kpis.proScore === null || kpis.proScore === undefined ? "—" : `${kpis.proScore}/100`} trend={kpis.proScore >= 60 ? undefined : -1} />
    </div>
  );
}
