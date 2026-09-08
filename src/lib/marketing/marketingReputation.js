// Reputation -- "gérer réputation (score réputation, évolution)" (section
// 1), "synchroniser avec ESG (réputation durable)" (section 5). Builds on
// lib/progression/reputation.js's own overall reputation score (already
// computed once per day inside runDailyCycle()'s progression step and
// exposed on DailyReport as progressionReport.reputation) rather than
// re-simulating a second, disconnected reputation number -- Marketing
// layers a "marketing reputation" on top, blending that baseline with
// the ESG sustainability score (durable/responsible reputation) and how
// well the current campaigns are performing (a well-run campaign lifts
// brand perception; an overspent, low-ROI one erodes it).
import { safeArray, safeNumber, safeObject } from "../safe";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// baseReputation: progressionReport.reputation (0-100) when available,
// otherwise the ESG/staff-driven target lib/progression/reputation.js
// itself falls back to.
export function computeMarketingReputation({ baseReputation = 60, sustainabilityScore = 50, campaigns = [] } = {}) {
  const active = safeArray(campaigns).filter((campaign) => campaign.status === "active");
  const campaignScore = active.length
    ? active.reduce((total, campaign) => total + clamp(safeNumber(campaign.roi, 0) * 20, 0, 100), 0) / active.length
    : 60;

  const score = clamp(safeNumber(baseReputation, 60) * 0.55 + safeNumber(sustainabilityScore, 50) * 0.25 + campaignScore * 0.2, 0, 100);
  return Math.round(score);
}

export function reputationTrend(previousScore, currentScore) {
  if (!Number.isFinite(previousScore)) return 0;
  return Math.round((safeNumber(currentScore, 0) - safeNumber(previousScore, 0)) * 10) / 10;
}

export function reputationTier(score) {
  const value = safeNumber(score, 0);
  if (value >= 80) return "excellente";
  if (value >= 60) return "bonne";
  if (value >= 40) return "moyenne";
  return "fragile";
}

export function durableReputationBonus(esg) {
  const sustainability = safeNumber(safeObject(esg).sustainabilityScore, 50);
  return Math.round(clamp((sustainability - 50) / 2, -25, 25));
}
