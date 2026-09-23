// The "board game numérique" redesign's pedagogical core (Étape 4):
// cause-to-effect chains the player can actually follow ("Prix trop
// élevé -> Occupation en baisse -> ..."), built ONLY from figures the
// rest of the app already computes -- lib/demand/demandEngine.js's own
// describeDemand() drivers and lib/dashboard/dashboardEngine.js's kpis
// and hotelState.staffing (the exact same staffing figures
// dailyReview.js's buildStaffingChain() already reads). Nothing here
// recomputes the simulation; it only reads it and narrates the links a
// non-hotelier player wouldn't otherwise connect. Pure and deterministic.
import { safeNumber, safeObject } from "../safe";

function driverFactor(demand, key) {
  return demand?.drivers?.find((driver) => driver.key === key)?.factor ?? null;
}

// Prix trop élevé pour le standing -> la demande en tient compte ->
// occupation en baisse malgré un ADR soutenu.
function priceOccupancyChain({ kpis, demand }) {
  const factor = driverFactor(demand, "price");
  if (factor === null || factor >= 1) return null;
  const adr = kpis.adr ?? kpis.averagePrice;
  return {
    id: "price-occupancy",
    chain: [
      `Prix perçu comme trop élevé pour le standing de l'hôtel (facteur demande ×${factor.toFixed(2)})`,
      `Occupation limitée à ${kpis.occupancyRate}% ce soir`,
      adr !== null && adr !== undefined ? `ADR resté soutenu (${adr} €) malgré le remplissage réduit` : "Remplissage réduit malgré un tarif soutenu",
    ],
    businessConcept: "Élasticité-prix de la demande",
  };
}

// Sous-effectif ou qualité housekeeping en baisse -> chambres pas prêtes à
// temps -> retard au check-in -> risque d'avis négatifs.
function housekeepingChain({ kpis, hotelState }) {
  const staffing = safeObject(hotelState.staffing);
  const coverage = safeNumber(staffing.housekeepingCoverage, 1);
  const quality = kpis.housekeepingQuality;
  const understaffed = coverage < 1;
  const belowStandard = quality !== null && quality !== undefined && quality < 60;
  if (!understaffed && !belowStandard) return null;
  return {
    id: "housekeeping-reviews",
    chain: [
      understaffed
        ? `Sous-effectif housekeeping (couverture ${Math.round(coverage * 100)}%, nettoyage ${Number(staffing.cleaningDelayFactor ?? 1).toFixed(1)}× plus long)`
        : `Qualité housekeeping en retrait (${quality}/100)`,
      "Chambres pas prêtes à temps pour les arrivées",
      "Client mécontent à l'arrivée",
      "Risque d'avis négatif sur la propreté",
    ],
    businessConcept: "Temps de rotation des chambres",
  };
}

// Réputation en retrait -> la demande en tient compte -> moins de
// réservations attirées demain.
function reputationDemandChain({ demand }) {
  const factor = driverFactor(demand, "reputation");
  if (factor === null || factor >= 1) return null;
  return {
    id: "reputation-demand",
    chain: [`Réputation en retrait (facteur demande ×${factor.toFixed(2)})`, "Moins de nouvelles réservations attirées", "Occupation de demain sous pression"],
    businessConcept: "Effet de réputation sur la demande",
  };
}

const RULES = [priceOccupancyChain, housekeepingChain, reputationDemandChain];

// [{ id, chain: [step, step, ...], businessConcept }] -- only the chains
// whose real trigger condition actually held today, most impactful rules
// first (the order RULES lists them).
export function buildCausalLinks({ kpis, hotelState, demand } = {}) {
  if (!kpis) return [];
  const inputs = { kpis, hotelState: safeObject(hotelState), demand: demand || null };
  return RULES.map((rule) => rule(inputs)).filter(Boolean);
}

export default buildCausalLinks;
