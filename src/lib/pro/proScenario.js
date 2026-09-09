// Hotel creation ("choix du type d'hôtel / positionnement / stratégie
// professionnelle") and the scripted 24-month timeline (marché,
// concurrence, macro-économie: crises et opportunités). Reuses
// lib/tfe/tfeScenario.js's own hotel-bundle builder (already generic
// over size/positioning/segments/strategy, built on the same guest
// bundle every module shares) rather than inventing a second one --
// this module only adds its own professional strategy flavor and its
// own, richer 24-month timeline.
import { createTfeHotelBundle, HOTEL_SIZE_OPTIONS, SEGMENT_OPTIONS, POSITIONING_TIERS } from "../tfe/tfeScenario";
import { safeArray, safeNumber, safeObject } from "../safe";

export { HOTEL_SIZE_OPTIONS, SEGMENT_OPTIONS, POSITIONING_TIERS };

// Professional strategies, distinct from the TFE Solo mode's own
// (croissance/rentabilité/durable): a Pro run is framed as steering an
// already-operating establishment through a professional playbook.
export const PRO_STRATEGY_OPTIONS = [
  { id: "expansion", label: "Expansion", description: "Priorité à la croissance du chiffre d'affaires et de l'occupation sur les 24 mois." },
  { id: "optimisation", label: "Optimisation opérationnelle", description: "Priorité à la marge et à l'efficacité (RM, F&B, housekeeping)." },
  { id: "transformation-digitale", label: "Transformation digitale & durable", description: "Priorité à la réservation directe, à l'ESG et à l'expérience client." },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// The "création d'hôtel" step: builds on createTfeHotelBundle()'s own
// size/positioning/segments handling, then folds in this module's own
// professional strategy.
export function createProHotelBundle({ roomCount = 30, positioningTier = "midscale", strategy = "optimisation", segments = [], referenceDate = new Date() } = {}) {
  const base = createTfeHotelBundle({ roomCount, positioningTier, strategy: "rentabilite", segments, referenceDate });

  if (strategy === "expansion") {
    return {
      ...base,
      hotelState: {
        ...base.hotelState,
        marketing: { ...base.hotelState.marketing, budget: Math.round(safeNumber(base.hotelState.marketing?.budget, 0) * 1.25) },
      },
    };
  }

  if (strategy === "transformation-digitale") {
    return {
      ...base,
      hotelState: {
        ...base.hotelState,
        esg: { ...base.hotelState.esg, sustainabilityScore: Math.round(clamp(safeNumber(base.hotelState.esg?.sustainabilityScore, 50) + 10, 0, 100)) },
      },
    };
  }

  return base; // "optimisation" keeps the rentabilité-tuned base as-is
}

// The scripted 24-month timeline: crises (inflation, pénurie de
// personnel, chute de réputation, crise énergétique) and opportunities
// (subvention ESG, partenariat, événement local, tendance marché) tied
// to a market/competition/macro-economic narrative. Each `apply` is a
// pure (hotelBundle) => nextHotelBundle transform, the same contract
// every module's own *Actions.js already uses. `durationMonths` drives
// proCrises.js/proOpportunities.js's own rolling "still active" window.
export const PRO_TIMELINE = [
  {
    month: 3,
    type: "crisis",
    id: "inflation",
    department: "finance",
    title: "Poussée inflationniste",
    description: "Les coûts d'approvisionnement et l'énergie augmentent fortement : les charges fixes et le food cost se tendent.",
    durationMonths: 6,
    apply: (bundle) => ({
      ...bundle,
      hotelState: { ...bundle.hotelState, finance: { ...bundle.hotelState.finance, fixedCosts: Math.round(safeNumber(bundle.hotelState.finance?.fixedCosts, 0) * 1.12) } },
    }),
  },
  {
    month: 6,
    type: "crisis",
    id: "penurie-staff",
    department: "staff",
    title: "Pénurie de personnel",
    description: "Le marché de l'emploi se tend : difficile de recruter, l'équipe en place est mise sous pression.",
    durationMonths: 5,
    apply: (bundle) => ({
      ...bundle,
      restaurantState: {
        ...bundle.restaurantState,
        staff: safeArray(bundle.restaurantState?.staff).map((person) => ({ ...person, satisfaction: Math.round(clamp(safeNumber(person.satisfaction, 70) - 8, 0, 100)) })),
      },
    }),
  },
  {
    month: 9,
    type: "opportunity",
    id: "subvention-esg",
    department: "esg",
    title: "Subvention ESG",
    description: "Une subvention publique récompense les démarches durables engagées : le score ESG progresse.",
    durationMonths: 3,
    roiEstimate: 12000,
    apply: (bundle) => ({
      ...bundle,
      hotelState: { ...bundle.hotelState, esg: { ...bundle.hotelState.esg, sustainabilityScore: Math.round(clamp(safeNumber(bundle.hotelState.esg?.sustainabilityScore, 50) + 8, 0, 100)) } },
    }),
  },
  {
    month: 12,
    type: "crisis",
    id: "chute-reputation",
    department: "marketing",
    title: "Chute de réputation",
    description: "Une série d'avis négatifs entache la réputation en ligne de l'établissement.",
    durationMonths: 4,
    apply: (bundle) => ({
      ...bundle,
      hotelState: { ...bundle.hotelState, marketing: { ...bundle.hotelState.marketing, reputationBonus: Math.round(safeNumber(bundle.hotelState.marketing?.reputationBonus, 0) - 10) } },
    }),
  },
  {
    month: 15,
    type: "opportunity",
    id: "partenariat-corporate",
    department: "rm",
    title: "Partenariat corporate",
    description: "Un accord-cadre avec une entreprise locale garantit un volume de nuitées corporate régulier.",
    durationMonths: 6,
    roiEstimate: 24000,
    apply: (bundle) => ({
      ...bundle,
      reservations: safeArray(bundle.reservations).map((reservation) =>
        String(reservation.segment || "").toLowerCase().includes("corpor") ? { ...reservation, price: Math.round(safeNumber(reservation.price, 0) * 1.06) } : reservation
      ),
    }),
  },
  {
    month: 18,
    type: "crisis",
    id: "crise-energetique",
    department: "esg",
    title: "Crise énergétique",
    description: "La flambée des prix de l'énergie pèse sur les coûts d'exploitation et l'empreinte carbone perçue.",
    durationMonths: 4,
    apply: (bundle) => ({
      ...bundle,
      hotelState: {
        ...bundle.hotelState,
        esg: { ...bundle.hotelState.esg, energyConsumption: Math.round(clamp(safeNumber(bundle.hotelState.esg?.energyConsumption, 60) + 12, 0, 100)) },
        finance: { ...bundle.hotelState.finance, fixedCosts: Math.round(safeNumber(bundle.hotelState.finance?.fixedCosts, 0) * 1.08) },
      },
    }),
  },
  {
    month: 21,
    type: "opportunity",
    id: "evenement-local",
    department: "restaurant",
    title: "Grand événement local",
    description: "Un festival régional dope la fréquentation du restaurant et de l'hôtel sur plusieurs semaines.",
    durationMonths: 2,
    roiEstimate: 9000,
    apply: (bundle) => ({
      ...bundle,
      reservations: safeArray(bundle.reservations).map((reservation) => ({ ...reservation, price: Math.round(safeNumber(reservation.price, 0) * 1.05) })),
    }),
  },
];

// Applies every scheduled timeline entry for this exact month (there is
// at most one or two today, but the shape supports more) -- called once
// per playProMonth() before the underlying day is actually played, so
// its effects are visible in that same month's report.
export function applyScheduledEvents(month, hotelBundle) {
  const entries = PRO_TIMELINE.filter((entry) => entry.month === month);
  const nextBundle = entries.reduce((bundle, entry) => entry.apply(bundle), safeObject(hotelBundle));
  return { bundle: nextBundle, triggered: entries };
}
