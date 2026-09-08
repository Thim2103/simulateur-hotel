// TFE scoring -- "scoring TFE (performance globale)" (section 1). A
// single composite score (0-100) blending EBITDA margin (Finance),
// occupation (PMS/RM), staff morale (Staff), marketing ROI/reputation
// (Marketing), ESG score, housekeeping quality, and storyline
// completion -- "synchroniser avec Finance/PMS/RM/Staff/Marketing/ESG/
// Housekeeping" (section 5).
import { safeNumber } from "../safe";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

// Weighted blend: Finance and PMS/RM occupancy carry the most weight (a
// TFE is, first and foremost, a hotel-management exercise), the other
// modules each contribute a smaller share, plus a storyline-completion
// bonus once missions/objectives are actually being achieved.
export function computeTfeScore({
  ebitdaMargin = 0,
  occupancyRate = 0,
  staffMorale = 60,
  marketingRoi = 1,
  esgScore = 55,
  housekeepingQuality = 60,
  missionsCompletedRatio = 0,
  objectivesAchievedRatio = 0,
} = {}) {
  const financeScore = clamp(50 + safeNumber(ebitdaMargin, 0) * 200, 0, 100); // 0% margin -> 50, 25% margin -> 100
  const occupancyScore = clamp(safeNumber(occupancyRate, 0), 0, 100);
  const marketingScore = clamp(safeNumber(marketingRoi, 1) * 40, 0, 100); // 2.5x ROI -> 100
  const storylineScore = clamp((safeNumber(missionsCompletedRatio, 0) + safeNumber(objectivesAchievedRatio, 0)) * 50, 0, 100);

  const total =
    financeScore * 0.3 +
    occupancyScore * 0.2 +
    clamp(safeNumber(staffMorale, 60), 0, 100) * 0.15 +
    marketingScore * 0.1 +
    clamp(safeNumber(esgScore, 55), 0, 100) * 0.1 +
    clamp(safeNumber(housekeepingQuality, 60), 0, 100) * 0.1 +
    storylineScore * 0.05;

  return Math.round(clamp(total, 0, 100));
}

export function scoreGrade(score) {
  const value = safeNumber(score, 0);
  if (value >= 90) return "A";
  if (value >= 75) return "B";
  if (value >= 60) return "C";
  if (value >= 45) return "D";
  return "F";
}

// Risques/opportunités du mois -- "risques" et "opportunités" KPI
// (section 4) -- derived from the count of error/opportunity-type
// diagnostics the business modules themselves already produced this
// month (see tfeEngine.js, which collects them before calling this).
export function computeRisksAndOpportunities(allDiagnostics = []) {
  const risks = allDiagnostics.filter((diagnostic) => diagnostic.type === "error" || (diagnostic.type === "anomaly" && diagnostic.severity === "high"));
  const opportunities = allDiagnostics.filter((diagnostic) => diagnostic.type === "opportunity");
  return { risks: risks.length, opportunities: opportunities.length, riskDetails: risks, opportunityDetails: opportunities };
}

export function computeEbitdaMargin({ ebitda, revenue } = {}) {
  const rev = safeNumber(revenue, 0);
  if (rev <= 0) return 0;
  return round2(safeNumber(ebitda, 0) / rev);
}
