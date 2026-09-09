// Generates {type, severity, message} diagnostics for the RM Advanced
// module -- same shape lib/analytics/analyticsDiagnostics.js and every
// other module's own diagnostics generator already uses (see
// lib/clients/clientsDiagnostics.js / lib/restaurantAdvanced/
// restaurantDiagnostics.js).
import { safeNumber, safeObject } from "../safe";

export function generateRmAdvancedDiagnostics({
  compression = {},
  displacement = {},
  pickupCurves = {},
  otaStrategy = {},
  staffOverload = null,
  esgScore = null,
  clientsSatisfaction = null,
  marketingReputation = null,
} = {}) {
  const diagnostics = [];
  const comp = safeObject(compression);
  const disp = safeObject(displacement);
  const pickup = safeObject(pickupCurves);
  const ota = safeObject(otaStrategy);

  if (comp.avgCompression !== null && comp.avgCompression >= 92) {
    diagnostics.push({ type: "opportunity", severity: "low", message: "Compression très élevée : marge pour augmenter les tarifs sur les prochaines dates." });
  }

  if ((comp.lowOccupancyDates || []).length > 3) {
    diagnostics.push({ type: "anomaly", severity: "medium", message: "Plusieurs dates sous-occupées à venir : envisager une stimulation tarifaire." });
  }

  if ((comp.highCompressionDates || []).length > 0 && disp.totalLoss > 0) {
    const severity = disp.totalLoss > 2000 ? "high" : "medium";
    diagnostics.push({ type: "error", severity, message: `Displacement estimé à ${Math.round(disp.totalLoss)} € : mix segment sous-optimal sur les dates en tension.` });
  }

  if (ota.otaShare !== null && ota.otaShare !== undefined && ota.otaShare > 60) {
    diagnostics.push({ type: "opportunity", severity: "medium", message: "Forte dépendance aux OTA (> 60 %) : réduire la commission en développant le direct." });
  }

  if (pickup.momentum !== null && pickup.momentum !== undefined && pickup.momentum < -15) {
    diagnostics.push({ type: "anomaly", severity: "medium", message: "Rythme de réservation en ralentissement à l'approche de la date d'arrivée." });
  }

  if (staffOverload !== null && safeNumber(staffOverload, 0) > 70) {
    diagnostics.push({ type: "anomaly", severity: "medium", message: "Surcharge du personnel : le rythme de compression actuel risque d'impacter le service." });
  }

  if (esgScore !== null && safeNumber(esgScore, 0) >= 75 && ota.otaShare > 40) {
    diagnostics.push({ type: "opportunity", severity: "low", message: "Bon score ESG : valoriser le positionnement durable pour capter plus de réservations directes premium." });
  }

  if (clientsSatisfaction !== null && safeNumber(clientsSatisfaction, 65) < 55 && comp.avgCompression > 75) {
    diagnostics.push({ type: "anomaly", severity: "medium", message: "Satisfaction clients faible malgré une forte compression : le prix perçu est peut-être trop élevé." });
  }

  if (marketingReputation !== null && safeNumber(marketingReputation, 50) < 40) {
    diagnostics.push({ type: "anomaly", severity: "low", message: "Réputation marketing faible : risque de baisse du taux de conversion sur le direct." });
  }

  return diagnostics;
}
