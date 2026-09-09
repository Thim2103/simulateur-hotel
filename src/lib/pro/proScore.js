// Professional scoring -- "scoring professionnel (global + par
// département)". A composite score (0-100) blending Finance, PMS/RM
// (base + avancé), F&B (restaurant avancé), Staff, Marketing, ESG,
// Housekeeping, Clients and storyline (missions/objectives) completion
// -- "synchroniser avec tous les modules" -- plus a per-department
// breakdown for the audits pages.
import { safeNumber } from "../safe";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Weighted blend: Finance and RM occupancy/mix carry the most weight (a
// professional simulation is, first and foremost, a P&L exercise), F&B
// and the other modules each contribute a smaller share, plus a
// storyline-completion bonus and a crisis penalty.
export function computeProScore({
  ebitdaMargin = 0,
  occupancyRate = 0,
  rmDirectShare = 40,
  fbGrossMargin = 60,
  staffMorale = 60,
  marketingReputation = 55,
  esgScore = 55,
  housekeepingQuality = 60,
  clientsSatisfaction = 65,
  missionsCompletedRatio = 0,
  objectivesAchievedRatio = 0,
  crisisScorePenalty = 0,
} = {}) {
  const financeScore = clamp(50 + safeNumber(ebitdaMargin, 0) * 200, 0, 100);
  const occupancyScore = clamp(safeNumber(occupancyRate, 0), 0, 100);
  const rmScore = clamp((occupancyScore + safeNumber(rmDirectShare, 40)) / 2, 0, 100);
  const fbScore = clamp(safeNumber(fbGrossMargin, 60), 0, 100);
  const storylineScore = clamp((safeNumber(missionsCompletedRatio, 0) + safeNumber(objectivesAchievedRatio, 0)) * 50, 0, 100);

  const total =
    financeScore * 0.25 +
    rmScore * 0.15 +
    fbScore * 0.1 +
    clamp(safeNumber(staffMorale, 60), 0, 100) * 0.12 +
    clamp(safeNumber(marketingReputation, 55), 0, 100) * 0.08 +
    clamp(safeNumber(esgScore, 55), 0, 100) * 0.1 +
    clamp(safeNumber(housekeepingQuality, 60), 0, 100) * 0.08 +
    clamp(safeNumber(clientsSatisfaction, 65), 0, 100) * 0.07 +
    storylineScore * 0.05;

  return Math.round(clamp(total - safeNumber(crisisScorePenalty, 0), 0, 100));
}

export function scoreGrade(score) {
  const value = safeNumber(score, 0);
  if (value >= 90) return "A";
  if (value >= 75) return "B";
  if (value >= 60) return "C";
  if (value >= 45) return "D";
  return "F";
}

// Per-department scores (0-100) -- the same figures proAudits.js's own
// per-department audit already surfaces, kept in sync here so
// pages/ProDashboard.jsx's "score par département" chart and
// pages/ProAudits.jsx's audit grades always agree.
export function computeDepartmentScores({
  ebitdaMargin = 0,
  occupancyRate = 0,
  rmDirectShare = 40,
  fbGrossMargin = 60,
  staffMorale = 60,
  marketingReputation = 55,
  esgScore = 55,
  housekeepingQuality = 60,
  clientsSatisfaction = 65,
} = {}) {
  return {
    finance: Math.round(clamp(50 + safeNumber(ebitdaMargin, 0) * 200, 0, 100)),
    rm: Math.round(clamp((safeNumber(occupancyRate, 0) + safeNumber(rmDirectShare, 40)) / 2, 0, 100)),
    fb: Math.round(clamp(safeNumber(fbGrossMargin, 60), 0, 100)),
    staff: Math.round(clamp(safeNumber(staffMorale, 60), 0, 100)),
    marketing: Math.round(clamp(safeNumber(marketingReputation, 55), 0, 100)),
    esg: Math.round(clamp(safeNumber(esgScore, 55), 0, 100)),
    housekeeping: Math.round(clamp(safeNumber(housekeepingQuality, 60), 0, 100)),
    clients: Math.round(clamp(safeNumber(clientsSatisfaction, 65), 0, 100)),
  };
}

// Risques/opportunités du mois -- derived from the count of
// error/opportunity-type diagnostics the business modules themselves
// already produced this month (see proEngine.js, which collects them
// before calling this) -- same approach lib/tfe/tfeScore.js's own
// computeRisksAndOpportunities() already established.
export function computeRisksAndOpportunities(allDiagnostics = []) {
  const risks = allDiagnostics.filter((diagnostic) => diagnostic.type === "error" || (diagnostic.type === "anomaly" && diagnostic.severity === "high"));
  const opportunities = allDiagnostics.filter((diagnostic) => diagnostic.type === "opportunity");
  return { risks: risks.length, opportunities: opportunities.length, riskDetails: risks, opportunityDetails: opportunities };
}

export function computeEbitdaMargin({ ebitda, revenue } = {}) {
  const rev = safeNumber(revenue, 0);
  if (rev <= 0) return 0;
  return Math.round((safeNumber(ebitda, 0) / rev) * 10000) / 10000;
}
