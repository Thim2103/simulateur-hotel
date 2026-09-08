// Marketing diagnostics -- same anomaly/error/opportunity vocabulary
// lib/finance/financeDiagnostics.js/lib/staff/staffDiagnostics.js already
// use, applied to one marketing cycle's own numbers. See
// marketingEngine.js's marketingDiagnosticsToAnalytics() for how these
// fold into the Analytics module's own diagnostics list.
import { safeArray, safeNumber, safeObject } from "../safe";

const DIAGNOSTIC_TYPES = ["anomaly", "error", "opportunity"];

function diagnostic(type, severity, message) {
  return { type: DIAGNOSTIC_TYPES.includes(type) ? type : "anomaly", severity, message };
}

export function generateMarketingDiagnostics({ budget, roi, conversion, reputation, channels, campaigns, staffOverload } = {}) {
  const diagnostics = [];
  const budgetInfo = safeObject(budget);
  const roiInfo = safeObject(roi);
  const conversionInfo = safeObject(conversion);
  const enabledChannels = safeArray(channels).filter((channel) => channel.enabled !== false);
  const active = safeArray(campaigns).filter((campaign) => campaign.status === "active");

  if (roiInfo.overallRoi !== undefined && roiInfo.overallRoi < 1 && budgetInfo.total > 0) {
    diagnostics.push(diagnostic("error", "high", `ROI marketing négatif (${roiInfo.overallRoi}x) : le budget dépensé génère moins qu'il ne coûte.`));
  } else if (roiInfo.overallRoi !== undefined && roiInfo.overallRoi < 1.5 && budgetInfo.total > 0) {
    diagnostics.push(diagnostic("anomaly", "medium", `ROI marketing faible (${roiInfo.overallRoi}x).`));
  }

  if (conversionInfo.conversionRate !== undefined && conversionInfo.conversionRate < 2) {
    diagnostics.push(diagnostic("anomaly", "medium", `Taux de conversion faible (${conversionInfo.conversionRate}%) : les leads générés ne se transforment pas en réservations.`));
  }

  const lowRoiCampaigns = active.filter((campaign) => safeNumber(campaign.roi, 0) < 1);
  if (lowRoiCampaigns.length > 0) {
    diagnostics.push(diagnostic("error", "high", `${lowRoiCampaigns.length} campagne(s) active(s) avec un ROI négatif : ${lowRoiCampaigns.map((c) => c.name).join(", ")}.`));
  }

  if (enabledChannels.length === 1) {
    diagnostics.push(diagnostic("anomaly", "medium", `Dépendance à un seul canal (${enabledChannels[0]?.name}) : diversifier réduirait le risque d'acquisition.`));
  }

  if (safeNumber(reputation, 0) < 40) {
    diagnostics.push(diagnostic("error", "high", `Réputation fragile (${reputation}/100) : impact direct sur la conversion et le pricing.`));
  } else if (safeNumber(reputation, 0) < 55) {
    diagnostics.push(diagnostic("anomaly", "medium", `Réputation moyenne (${reputation}/100).`));
  }

  if (safeNumber(staffOverload, 0) > 120 && active.length > 0) {
    diagnostics.push(diagnostic("anomaly", "medium", `Les campagnes actives génèrent une demande que l'équipe ne peut pas absorber sereinement (surcharge ${staffOverload}%).`));
  }

  const highRoiCampaigns = active.filter((campaign) => safeNumber(campaign.roi, 0) >= 3);
  if (highRoiCampaigns.length > 0) {
    diagnostics.push(diagnostic("opportunity", "low", `${highRoiCampaigns.length} campagne(s) très performante(s) (ROI ≥ 3x) : envisager d'augmenter leur budget.`));
  }

  if (roiInfo.overallRoi !== undefined && roiInfo.overallRoi >= 2 && safeNumber(reputation, 0) >= 60) {
    diagnostics.push(diagnostic("opportunity", "low", `Marketing performant (ROI ${roiInfo.overallRoi}x, réputation ${reputation}/100) : bon moment pour repositionner l'établissement vers une gamme supérieure.`));
  }

  return diagnostics;
}
