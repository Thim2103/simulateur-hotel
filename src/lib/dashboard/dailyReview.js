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
import { maintenanceOn, WEAR_THRESHOLD } from "../maintenance/maintenanceCostEngine";
import { describeCalendar, todaySnapshot, auditOn } from "../hotelEvents/hotelEventsEngine";
import { activeCampaigns, campaignsEndedOn, describeCampaign } from "../marketing/targetedCampaigns";
import { reviewsPostedOn, unansweredNegativeReviews, currentImpact } from "../clients/guestReviewEngine";
import { describeMiceDay } from "../mice/miceReport";

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
  // Season and events around the day just played (lib/hotelEvents/): what is
  // coming, what ends today, and the audit result if there was one.
  const hotelState = careerState?.hotel?.hotelState;
  const snapshot = todaySnapshot(hotelState);
  const calendar = snapshot?.date && snapshot.day === careerState?.day ? { ...describeCalendar(snapshot.date, hotelState), audit: auditOn(hotelState, careerState.day) } : null;
  if (calendar) {
    calendar.upcoming.forEach((event) => {
      causalChain.push(`${event.name} dans ${event.startsInDays} jour${event.startsInDays > 1 ? "s" : ""} (${event.totalDays} j) : ${event.effects[0] || event.description}`);
    });
    calendar.ongoing.filter((event) => event.endsToday && event.kind !== "audit").forEach((event) => {
      causalChain.push(`${event.name} se termine aujourd'hui : la demande et les charges reviennent à la normale.`);
    });
    if (calendar.audit) causalChain.push(calendar.audit.message);
  }
  // The commercial levers at work today (lib/rm/ yield management, lib/marketing/
  // targeted campaigns): only when there is something to report.
  const levers = careerState?.lastDayReport?.demandReport?.levers;
  const playedDate = careerState?.lastDayReport?.date;
  const marketingToday = safeArray(levers?.marketing?.campaigns);
  const endedCampaigns = playedDate ? campaignsEndedOn(hotelState, playedDate).map((campaign) => describeCampaign(campaign, playedDate)) : [];
  const growth =
    levers && (levers.yield?.enabled || marketingToday.length > 0 || endedCampaigns.length > 0)
      ? {
          yield: levers.yield?.enabled ? levers.yield : null,
          marketingFactor: levers.marketing?.factor ?? 1,
          campaigns: marketingToday,
          running: playedDate ? activeCampaigns(hotelState).map((campaign) => describeCampaign(campaign, playedDate)) : [],
          ended: endedCampaigns,
        }
      : null;
  if (growth?.yield && growth.yield.adjusted > 0) {
    causalChain.push(`Yield management : ${growth.yield.adjusted} réservation(s) tarifée(s) automatiquement (${growth.yield.revenueDelta >= 0 ? "+" : "−"}${Math.abs(growth.yield.revenueDelta).toLocaleString("fr-FR")} € de revenu attendu).`);
  }
  endedCampaigns.forEach((campaign) => {
    causalChain.push(`Campagne « ${campaign.name} » terminée : ${campaign.extraBookings.toLocaleString("fr-FR")} réservation(s) supplémentaire(s), ROI ${campaign.roi >= 0 ? "+" : "−"}${Math.abs(Math.round(campaign.roi * 100))} %.`);
  });
  // The reviews the guests leaving today posted (lib/clients/guestReviewEngine.js),
  // and how many bad ones still wait for an answer.
  const postedReviews = reviewsPostedOn(hotelState, careerState?.day).map((review) => ({ ...review, currentImpact: currentImpact({ ...review, response: null }) }));
  const toAnswer = unansweredNegativeReviews(hotelState).length;
  const guestReviews = postedReviews.length > 0 || toAnswer > 0 ? { posted: postedReviews, toAnswer } : null;
  postedReviews
    .filter((review) => review.profile === "vip")
    .forEach((review) => {
      causalChain.push(`${review.guestName} (V.I.P.) a laissé un avis ${review.rating}/5 : il pèse ×${review.weight} sur votre réputation et sur la demande de demain.`);
    });
  // Seminar quotes and events around the day just played (lib/mice/).
  const mice = playedDate ? describeMiceDay(hotelState, playedDate) : null;
  if (mice) {
    mice.newRequests.forEach((request) => {
      causalChain.push(`Nouvelle demande de devis : ${request.company}, ${request.attendees} personnes sur ${request.days} jour${request.days > 1 ? "s" : ""}. À traiter avant le ${request.expiresOn}.`);
    });
    mice.startingSoon.forEach((event) => {
      causalChain.push(`Séminaire ${event.company} le ${event.startDate} : ${event.attendees} personnes, préparez la salle ${event.meetingRoomNumber} et la restauration.`);
    });
    mice.today.forEach((event) => {
      causalChain.push(`Séminaire ${event.company} aujourd'hui : ${event.cateringPerDay.toLocaleString("fr-FR")} € de restauration et une salle pleine.`);
    });
    mice.completed.forEach((event) => {
      causalChain.push(`Séminaire ${event.company} terminé : ${event.quote.total.toLocaleString("fr-FR")} € de chiffre d'affaires.`);
    });
  }
  const maintenance = maintenanceOn(careerState?.hotel?.hotelState, careerState?.day);
  if (maintenance && maintenance.condition < WEAR_THRESHOLD) {
    causalChain.push(`L'hôtel est en mauvais état (${maintenance.condition}/100) : les clients le remarquent et des pannes d'usure menacent. Relevez le niveau d'entretien.`);
  }
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
    // Season, events in progress, announced events and audit result -- null
    // until a day has been played (lib/hotelEvents/).
    calendar,
    // The reviews left today by departing guests and how many bad ones are
    // still unanswered -- null when there is nothing to report.
    guestReviews,
    // Seminar quotes, events in progress, starting soon and finished -- null
    // when there is nothing to report.
    mice,
    // Yield management and marketing campaigns at work today -- null when
    // neither is in play.
    growth,
    // Today's upkeep bill ("Entretien & Charges d'exploitation"): by category,
    // at which level, and the hotel's condition -- null when nothing was
    // recorded (see lib/maintenance/maintenanceCostEngine.js).
    maintenance,
    // How strongly guests wanted to book today (see lib/demand/), null
    // until a day has been played with the demand model.
    demand: describeDemand(careerState?.lastDayReport?.demandReport),
    diagnostics: safeArray(dashboardState?.insights?.diagnostics),
    recommendations: safeArray(dashboardState?.insights?.recommendations),
    attentionItems: buildAttentionItems(dashboardState?.notifications, 5),
  };
}

export default buildDailyReview;
