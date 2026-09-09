// Builds "DailyReview" -- the "What happened?" screen shown after
// "Passer la journée" (see pages/DailyReview.jsx). Reuses
// dashboardEngine.js's own KPI/replay-summary/insights computation; the
// only new thing here is the causal chain, a short list of
// "X happened -> which led to Y" sentences built from today's KPIs and
// the most recent Analytics diagnostics/recommendations (see
// lib/analytics/analyticsEngine.js -- already computed by useCareer.js's
// nextDay() and stored as careerState.lastAnalysis).
import { safeArray, safeNumber } from "../safe";
import { buildAttentionItems } from "./attentionItems";

// A handful of rule-based causal links between today's own numbers --
// deliberately simple (this is a game-loop explanation for a non-hotelier
// player, not the full Analytics report, still reachable via "En savoir
// plus").
function buildCausalChain(kpis) {
  if (!kpis) return [];
  const chain = [];

  if (safeNumber(kpis.occupancyRate, 0) >= 85) {
    chain.push("Occupation très élevée aujourd'hui, ce qui a pu mettre le housekeeping sous pression.");
  }
  if (kpis.housekeepingQuality !== null && kpis.housekeepingQuality !== undefined && kpis.housekeepingQuality < 60) {
    chain.push("Qualité housekeeping en baisse, ce qui peut expliquer des avis clients moins bons.");
  }
  if (kpis.satisfaction !== null && kpis.satisfaction !== undefined && kpis.satisfaction < 3.5) {
    chain.push("Satisfaction client en retrait, à surveiller sur les prochains jours.");
  }
  if (kpis.staffMorale !== null && kpis.staffMorale !== undefined && kpis.staffMorale < 55) {
    chain.push("Moral d'équipe bas, ce qui peut freiner la productivité et la qualité de service.");
  }
  if (kpis.profit !== null && kpis.profit !== undefined) {
    chain.push(
      kpis.profit >= 0
        ? `Résultat positif du jour (${kpis.profit} €), porté par ${kpis.occupancyRate}% d'occupation.`
        : `Résultat négatif du jour (${kpis.profit} €) malgré ${kpis.occupancyRate}% d'occupation : les charges ont pesé plus lourd que le revenu.`
    );
  }
  return chain;
}

export function buildDailyReview({ careerState, dashboardState } = {}) {
  const kpis = dashboardState?.kpis || null;
  if (!kpis) return null;

  return {
    day: careerState?.day ?? null,
    date: kpis.date || null,
    summary: {
      revenue: kpis.revenueToday,
      profit: kpis.profit,
      satisfaction: kpis.satisfaction,
      staffMorale: kpis.staffMorale,
    },
    causalChain: buildCausalChain(kpis),
    diagnostics: safeArray(dashboardState?.insights?.diagnostics),
    recommendations: safeArray(dashboardState?.insights?.recommendations),
    attentionItems: buildAttentionItems(dashboardState?.notifications, 5),
  };
}

export default buildDailyReview;
