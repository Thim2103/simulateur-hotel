// The Dashboard has two reading levels: "casual" (plain-language labels,
// fewer numbers) and "expert" (the raw hotel-management vocabulary: ADR,
// RevPAR...). Nothing here changes what data is computed -- only how a
// handful of KPI labels/values are presented -- so dashboardEngine.js
// always computes the full KPI set and the view mode only picks which
// label/value pair a KpiCard shows.
export const VIEW_MODES = ["casual", "expert"];
export const DEFAULT_VIEW_MODE = "casual";

export function isValidViewMode(mode) {
  return VIEW_MODES.includes(mode);
}

export function normalizeViewMode(mode) {
  return isValidViewMode(mode) ? mode : DEFAULT_VIEW_MODE;
}

// The one KPI whose label/value genuinely differs between modes: casual
// players see "Prix moyen" (what guests actually paid today), experts see
// "ADR" (the RM engine's recommended Average Daily Rate, see
// lib/rm/dynamicPricing.js). Every other KPI (occupation, revenu,
// satisfaction, personnel) reads the same in both modes.
export function pricingKpiForMode(mode, { averagePrice, adr }) {
  if (normalizeViewMode(mode) === "expert") {
    return { label: "ADR", value: adr };
  }
  return { label: "Prix moyen", value: averagePrice };
}
