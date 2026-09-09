// RM Advanced actions -- "augmenter l'ADR / optimiser le mix segments /
// réduire la dépendance OTA / activer le pricing événementiel / cibler
// corporate & premium". Each is a pure (hotelBundle) => nextHotelBundle
// transform, same contract as lib/clients/clientsActions.js /
// lib/restaurantAdvanced/restaurantActions.js.
//
// These actions seed a new hotelState.rmAdvanced namespace (additive,
// optional, with sensible fallbacks) -- the same "lazy namespace"
// pattern already established for hotelState.clients/hotelState.restaurantAdvanced.
import { safeNumber, safeObject } from "../safe";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export const RM_ADVANCED_ACTION_CATALOG = [
  {
    id: "augmenter-adr",
    category: "pricing",
    label: "Augmenter l'ADR",
    description: "Relève le tarif moyen sur les dates en forte compression : capture davantage de valeur.",
  },
  {
    id: "optimiser-mix-segments",
    category: "mix",
    label: "Optimiser le mix segments",
    description: "Rééquilibre l'allocation des chambres vers les segments à plus forte valeur : réduit le displacement.",
  },
  {
    id: "reduire-dependance-ota",
    category: "distribution",
    label: "Réduire la dépendance OTA",
    description: "Pousse la réservation directe (site, téléphone) : augmente la part directe et réduit les commissions.",
  },
  {
    id: "activer-pricing-evenementiel",
    category: "pricing",
    label: "Activer le pricing événementiel",
    description: "Applique une majoration ciblée sur les dates d'événements locaux ou de forte demande.",
  },
  {
    id: "cibler-corporate-premium",
    category: "segments",
    label: "Cibler corporate & premium",
    description: "Développe les partenariats corporate et l'offre premium/long séjour : améliore le RevPAR net.",
  },
];

export function findRmAdvancedAction(actionId) {
  return RM_ADVANCED_ACTION_CATALOG.find((action) => action.id === actionId) || null;
}

export function applyRmAdvancedDecision(hotelBundle, actionId, payload = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const rmAdvanced = safeObject(hotelState.rmAdvanced);
  const marketing = safeObject(hotelState.marketing);

  switch (actionId) {
    case "augmenter-adr":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          rmAdvanced: {
            ...rmAdvanced,
            adrBonus: Math.round(clamp(safeNumber(rmAdvanced.adrBonus, 0) + 8, 0, 30)),
          },
        },
      };

    case "optimiser-mix-segments":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          rmAdvanced: {
            ...rmAdvanced,
            mixOptimizationBonus: Math.round(clamp(safeNumber(rmAdvanced.mixOptimizationBonus, 0) + 10, 0, 40)),
          },
        },
      };

    case "reduire-dependance-ota":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          rmAdvanced: {
            ...rmAdvanced,
            directBookingBonus: Math.round(clamp(safeNumber(rmAdvanced.directBookingBonus, 0) + 10, 0, 40)),
          },
        },
      };

    case "activer-pricing-evenementiel":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          rmAdvanced: {
            ...rmAdvanced,
            eventPricingBonus: Math.round(clamp(safeNumber(rmAdvanced.eventPricingBonus, 0) + 8, 0, 30)),
          },
        },
      };

    case "cibler-corporate-premium":
      // Boosts the corporate/premium pricing bonus, plus a small
      // marketing reputation lift (same namespace the marketing module
      // uses) since a stronger corporate/premium mix also lifts the
      // hotel's perceived positioning.
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          rmAdvanced: {
            ...rmAdvanced,
            corporatePremiumBonus: Math.round(clamp(safeNumber(rmAdvanced.corporatePremiumBonus, 0) + 8, 0, 30)),
          },
          marketing: {
            ...marketing,
            reputationBonus: Math.round(clamp(safeNumber(marketing.reputationBonus, 0) + 3, 0, 30)),
          },
        },
      };

    default:
      return bundle;
  }
}
