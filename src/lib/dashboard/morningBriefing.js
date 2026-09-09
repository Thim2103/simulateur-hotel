// Builds the "Morning Briefing" -- the first screen of the game-loop day
// (Morning -> MyHotel -> Decisions -> Day -> Results): a compact, human
// read of where the hotel stands right now, before the player dives into
// MyHotel. Pure reshape of what dashboardEngine.js/useDashboard.js already
// computed -- no new simulation, no persistence of its own.
import { safeArray, safeNumber } from "../safe";
import { buildAttentionItems } from "./attentionItems";

// A short, rule-based "what's going on" sentence -- not a full causal
// explanation (that's DailyReview's job, see dailyReview.js), just enough
// context to orient a non-hotelier player before they start their day.
function buildSituation(kpis) {
  if (!kpis) return "Aucune donnée pour l'instant : jouez une première journée pour voir votre hôtel prendre vie.";
  const parts = [];
  parts.push(
    kpis.occupancyRate >= 80
      ? `Forte demande : ${kpis.occupancyRate}% d'occupation.`
      : kpis.occupancyRate <= 40
      ? `Demande faible : seulement ${kpis.occupancyRate}% d'occupation.`
      : `Occupation stable, à ${kpis.occupancyRate}%.`
  );
  if (kpis.profit !== null && kpis.profit !== undefined) {
    parts.push(kpis.profit >= 0 ? `Le profit du jour est positif (${kpis.profit} €).` : `Le profit du jour est négatif (${kpis.profit} €).`);
  }
  return parts.join(" ");
}

export function buildMorningBriefing({ careerState, dashboardState } = {}) {
  const kpis = dashboardState?.kpis || null;
  const careerSummary = dashboardState?.careerSummary || null;

  return {
    day: careerState?.day ?? null,
    date: kpis?.date || null,
    kpis: {
      occupancyRate: kpis?.occupancyRate ?? null,
      adr: kpis?.adr ?? null,
      cash: kpis?.cash ?? null,
      staffMorale: kpis?.staffMorale ?? null,
      satisfaction: kpis?.satisfaction ?? null,
      reputation: kpis?.reputation ?? null,
    },
    situation: buildSituation(kpis),
    objectives: careerSummary
      ? {
          acceptedMissions: safeArray(careerSummary.acceptedMissions),
          achievedObjectivesCount: safeNumber(careerSummary.achievedObjectivesCount, 0),
          totalObjectives: safeNumber(careerSummary.totalObjectives, 0),
        }
      : null,
    alerts: buildAttentionItems(dashboardState?.notifications, 5),
  };
}

export default buildMorningBriefing;
