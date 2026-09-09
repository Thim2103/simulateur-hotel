// Generates {type, severity, message} diagnostics for the Restaurant
// Advanced module -- same shape lib/analytics/analyticsDiagnostics.js and
// every other module's own diagnostics generator already uses (see
// lib/clients/clientsDiagnostics.js).
import { safeNumber, safeObject } from "../safe";

export function generateRestaurantDiagnostics({
  foodCost = {},
  profitability = {},
  menuEngineering = {},
  popularity = {},
  staffOverload = null,
  esgWastePct = null,
} = {}) {
  const diagnostics = [];
  const fc = safeObject(foodCost);
  const profit = safeObject(profitability);
  const engineering = safeObject(menuEngineering);
  const pop = safeObject(popularity);
  const counts = safeObject(engineering.counts);
  const itemCount = Math.max(1, (engineering.items || []).length);

  if (fc.overall !== null && fc.overall > 38) {
    diagnostics.push({ type: "error", severity: "high", message: "Food cost critique (> 38 %) : la carte n'est plus rentable." });
  } else if (fc.overall !== null && fc.overall > 32) {
    diagnostics.push({ type: "anomaly", severity: "medium", message: "Food cost élevé (> 32 %) : revoir les fiches techniques ou les prix." });
  }

  if (fc.volatilityIndex !== null && safeNumber(fc.volatilityIndex, 0) > 60) {
    diagnostics.push({ type: "anomaly", severity: "medium", message: "Coûts matières très volatils : sécuriser les approvisionnements." });
  }

  if (esgWastePct !== null && safeNumber(esgWastePct, 0) > 55) {
    diagnostics.push({ type: "opportunity", severity: "low", message: "Gaspillage alimentaire élevé : une réduction améliorerait food cost et impact ESG." });
  }

  if (profit.grossMargin !== null && profit.grossMargin < 55) {
    diagnostics.push({ type: "anomaly", severity: "medium", message: "Marge brute F&B faible (< 55 %) : revoir le pricing ou les fournisseurs." });
  }

  if (profit.netMargin !== null && profit.netMargin < 15) {
    diagnostics.push({ type: "error", severity: "high", message: "Marge nette F&B insuffisante (< 15 %) après charges d'exploitation." });
  }

  if (counts.dogs / itemCount > 0.3) {
    diagnostics.push({ type: "opportunity", severity: "low", message: "Trop de plats 'Dogs' (peu populaires et peu rentables) : simplifier la carte." });
  }

  if (counts.plowhorses / itemCount > 0.35) {
    diagnostics.push({ type: "opportunity", severity: "low", message: "Beaucoup de 'Plowhorses' : plats populaires mais peu rentables à re-coster." });
  }

  if ((pop.declining || []).length > 2) {
    diagnostics.push({ type: "anomaly", severity: "medium", message: "Plusieurs plats en perte de popularité sur les derniers cycles." });
  }

  if (staffOverload !== null && safeNumber(staffOverload, 0) > 70) {
    diagnostics.push({ type: "anomaly", severity: "medium", message: "Cuisine en surcharge : risque de baisse de qualité en service." });
  }

  return diagnostics;
}
