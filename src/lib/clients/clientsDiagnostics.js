// Clients diagnostics -- same anomaly/error/opportunity vocabulary
// lib/housekeeping/housekeepingDiagnostics.js and siblings use, applied
// to one clients cycle's numbers. See clientsEngine.js's
// clientsDiagnosticsToAnalytics() for how these fold into the Analytics
// module's own diagnostics list.
import { safeNumber, safeObject } from "../safe";

function diagnostic(type, severity, message) {
  const VALID = ["anomaly", "error", "opportunity"];
  return { type: VALID.includes(type) ? type : "anomaly", severity, message };
}

export function generateClientsDiagnostics({
  satisfaction = null,
  loyalty = null,
  reviews = null,
  segments = null,
  behaviors = null,
  housekeepingQuality = null,
  staffMorale = null,
  esgScore = null,
} = {}) {
  const diagnostics = [];
  const sat = safeNumber(satisfaction, 65);
  const loy = safeNumber(loyalty, 50);
  const rev = safeObject(reviews);
  const seg = safeObject(segments);
  const beh = safeObject(behaviors);

  // Satisfaction alerts
  if (sat < 40) {
    diagnostics.push(diagnostic("error", "high", `Satisfaction client critique (${sat}/100) : risque immédiat de mauvais avis en ligne et de churn.`));
  } else if (sat < 60) {
    diagnostics.push(diagnostic("anomaly", "medium", `Satisfaction client faible (${sat}/100) : action corrective recommandée.`));
  }

  // Review trend
  if (rev.trend === "declining" && safeNumber(rev.avgRating, 3.5) < 3.5) {
    diagnostics.push(diagnostic("error", "high", `Tendance des avis en baisse (${rev.avgRating?.toFixed(1) ?? "—"}/5) : surveiller les canaux OTA et TripAdvisor.`));
  }
  if (rev.negative > 30) {
    diagnostics.push(diagnostic("anomaly", "medium", `${rev.negative} % d'avis négatifs : identifier les causes récurrentes (chambre, service, prix).`));
  }

  // Loyalty alerts
  if (loy < 35) {
    diagnostics.push(diagnostic("error", "high", `Fidélité très faible (${loy}/100) : la clientèle ne revient pas. Revoir l'offre de valeur.`));
  } else if (loy < 50) {
    diagnostics.push(diagnostic("anomaly", "medium", `Fidélité insuffisante (${loy}/100) : mettre en place un programme de fidélisation.`));
  }

  // Segment concentration risk
  const maxShare = Math.max(
    safeNumber(seg.business, 0),
    safeNumber(seg.leisure, 0),
    safeNumber(seg.famille, 0),
    safeNumber(seg.premium, 0)
  );
  if (maxShare > 65) {
    diagnostics.push(diagnostic("anomaly", "medium", `Concentration excessive sur un seul segment (${maxShare}%) : diversifier la mix clientèle pour réduire la saisonnalité.`));
  }

  // Cross-module integration: HK quality impact on satisfaction
  if (safeNumber(housekeepingQuality, 100) < 50 && sat < 70) {
    diagnostics.push(diagnostic("error", "high", `Qualité housekeeping insuffisante (${housekeepingQuality}/100) : impact direct mesurable sur la satisfaction des clients.`));
  }

  // Staff morale / service quality
  if (safeNumber(staffMorale, 100) < 45 && sat < 70) {
    diagnostics.push(diagnostic("anomaly", "medium", `Moral du personnel bas (${staffMorale}/100) : se reflète dans la qualité de service perçue par les clients.`));
  }

  // ESG / premium segment opportunity
  if (safeNumber(esgScore, 0) > 70 && safeNumber(seg.premium, 0) < 15) {
    diagnostics.push(diagnostic("opportunity", "low", `Bonne performance ESG (${esgScore}/100) : communiquer davantage pour attirer la clientèle premium éco-responsable.`));
  }

  // Return rate opportunity
  if (safeNumber(beh.returnRate, 0) > 60 && loy < 70) {
    diagnostics.push(diagnostic("opportunity", "low", `Taux de retour encourageant (${beh.returnRate}%) : accélérer la fidélisation avec une offre membre.`));
  }

  // Positive diagnosis
  if (sat >= 80 && loy >= 70 && safeNumber(rev.avgRating, 0) >= 4.2) {
    diagnostics.push(diagnostic("opportunity", "low", `Excellente expérience client (satisfaction ${sat}/100, fidélité ${loy}/100, note ${rev.avgRating?.toFixed(1) ?? "—"}/5) : idéal pour activer le referral.`));
  }

  return diagnostics;
}
