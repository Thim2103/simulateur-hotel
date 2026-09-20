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
import { describeDemand } from "../demand/demandEngine";
import { todaysStaffEvents } from "../staff/staffEventsEngine";
import { upgradesCompletedOn, UPGRADES } from "../zones/zoneUpgradesEngine";
import { floorsCompletedOn, SLOTS_PER_FLOOR } from "../expansion/hotelExpansionEngine";

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

// What the hotel's named team did today (see lib/staff/staffRoster.js):
// understaffing that slowed cleaning / hurt satisfaction, and repairs the
// in-house technician took on without an external contractor. Empty for a
// hotel with no roster.
function buildStaffingChain(hotelState) {
  const lines = [];
  const staffing = hotelState?.staffing;
  if (staffing) {
    if (safeNumber(staffing.housekeepingCoverage, 1) < 1) {
      lines.push(
        `Manque de gouvernantes (couverture ${Math.round(staffing.housekeepingCoverage * 100)} %) : le nettoyage prend ${Number(staffing.cleaningDelayFactor).toFixed(1)}× plus longtemps et la satisfaction des clients en pâtit — recrutez ou formez.`
      );
    }
    if (safeNumber(staffing.receptionCoverage, 1) < 1) {
      lines.push(`Réception en sous-effectif (couverture ${Math.round(staffing.receptionCoverage * 100)} %) : l'accueil se dégrade.`);
    }
  }
  const handled = safeArray(hotelState?.activeIncidents).filter((incident) => incident.autoRepaired && incident.status === "repairing").length;
  if (handled > 0) {
    lines.push(`Votre équipe de maintenance a pris en charge ${handled} panne(s) sans prestataire externe.`);
  }
  return lines;
}

export function buildDailyReview({ careerState, dashboardState } = {}) {
  const kpis = dashboardState?.kpis || null;
  if (!kpis) return null;

  // Reviews guests posted today about a still-open equipment incident (see
  // lib/maintenance/incidentImpact.js's appendIncidentReviews(), run by
  // useCareer.js's nextDay()) -- only today's, so the player sees what
  // just happened, not the whole backlog.
  const incidentReviews = safeArray(careerState?.hotel?.hotelState?.incidentReviews).filter((review) => review.day === careerState?.day);
  const causalChain = buildCausalChain(kpis);
  causalChain.push(...buildStaffingChain(careerState?.hotel?.hotelState));
  upgradesCompletedOn(careerState?.hotel?.hotelState, careerState?.day).forEach((entry) => {
    const upgrade = UPGRADES[entry.upgradeId];
    if (upgrade) causalChain.push(`Travaux terminés : ${upgrade.name}. Ses bénéfices s'appliquent dès maintenant.`);
  });
  floorsCompletedOn(careerState?.hotel?.hotelState, careerState?.day).forEach((entry) => {
    causalChain.push(`Gros œuvre terminé : l'étage ${entry.level} est construit. Aménagez ses chambres (jusqu'à ${SLOTS_PER_FLOOR}) pour augmenter votre capacité d'accueil.`);
  });
  if (incidentReviews.length > 0) {
    causalChain.push("Des pannes non réparées ont généré des avis négatifs et pèsent sur votre réputation : réparez-les vite (une réparation d'urgence évite toute pénalité).");
  }

  return {
    day: careerState?.day ?? null,
    date: kpis.date || null,
    summary: {
      revenue: kpis.revenueToday,
      profit: kpis.profit,
      satisfaction: kpis.satisfaction,
      staffMorale: kpis.staffMorale,
    },
    causalChain,
    incidentReviews,
    // Resignations, notices, sick leave and other HR news of the day (see
    // lib/staff/staffEventsEngine.js).
    staffEvents: todaysStaffEvents(careerState?.hotel?.hotelState, careerState?.day),
    // How strongly guests wanted to book today (see lib/demand/), null
    // until a day has been played with the demand model.
    demand: describeDemand(careerState?.lastDayReport?.demandReport),
    diagnostics: safeArray(dashboardState?.insights?.diagnostics),
    recommendations: safeArray(dashboardState?.insights?.recommendations),
    attentionItems: buildAttentionItems(dashboardState?.notifications, 5),
  };
}

export default buildDailyReview;
