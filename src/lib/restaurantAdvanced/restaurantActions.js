// Restaurant Advanced actions -- "optimiser la carte / réduire les
// pertes / renégocier fournisseurs / repositionner les prix / campagne
// plats signature". Each is a pure (hotelBundle) => nextHotelBundle
// transform, same contract as clientsActions.js / housekeepingActions.js.
//
// These actions seed a new hotelState.restaurantAdvanced namespace
// (additive, optional, with sensible fallbacks) -- the same "lazy
// namespace" pattern lib/clients/clientsActions.js used for
// hotelState.clients.
import { safeNumber, safeObject } from "../safe";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export const RESTAURANT_ACTION_CATALOG = [
  {
    id: "optimiser-carte",
    category: "menu",
    label: "Optimiser la carte",
    description: "Retire ou repositionne les plats 'Dogs' et 'Puzzles' : améliore la rentabilité moyenne de la carte.",
  },
  {
    id: "reduire-pertes",
    category: "foodcost",
    label: "Réduire les pertes",
    description: "Meilleur contrôle des portions et du stockage : réduit le gaspillage alimentaire et le food cost.",
  },
  {
    id: "renegocier-fournisseurs",
    category: "foodcost",
    label: "Renégocier les fournisseurs",
    description: "Nouveaux accords d'approvisionnement : réduit la volatilité des coûts matières.",
  },
  {
    id: "repositionner-prix",
    category: "profitability",
    label: "Repositionner les prix",
    description: "Ajustement tarifaire ciblé sur les plats à faible marge : améliore la marge brute et nette.",
  },
  {
    id: "campagne-plats-signature",
    category: "popularity",
    label: "Campagne plats signature",
    description: "Met en avant les plats phares en salle et en marketing : booste leur popularité et la réputation.",
  },
];

export function findRestaurantAction(actionId) {
  return RESTAURANT_ACTION_CATALOG.find((action) => action.id === actionId) || null;
}

export function applyRestaurantAdvancedDecision(hotelBundle, actionId, payload = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const restaurantAdvanced = safeObject(hotelState.restaurantAdvanced);
  const marketing = safeObject(hotelState.marketing);

  switch (actionId) {
    case "optimiser-carte":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          restaurantAdvanced: {
            ...restaurantAdvanced,
            menuOptimizationBonus: Math.round(clamp(safeNumber(restaurantAdvanced.menuOptimizationBonus, 0) + 8, 0, 30)),
          },
        },
      };

    case "reduire-pertes":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          restaurantAdvanced: {
            ...restaurantAdvanced,
            wasteReductionBonus: Math.round(clamp(safeNumber(restaurantAdvanced.wasteReductionBonus, 0) + 10, 0, 40)),
          },
        },
      };

    case "renegocier-fournisseurs":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          restaurantAdvanced: {
            ...restaurantAdvanced,
            supplierNegotiationBonus: Math.round(clamp(safeNumber(restaurantAdvanced.supplierNegotiationBonus, 0) + 6, 0, 30)),
          },
        },
      };

    case "repositionner-prix":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          restaurantAdvanced: {
            ...restaurantAdvanced,
            pricingBonus: Math.round(clamp(safeNumber(restaurantAdvanced.pricingBonus, 0) + 5, 0, 25)),
          },
        },
      };

    case "campagne-plats-signature":
      // Boosts dish popularity directly, plus a small marketing
      // reputation lift (same namespace the marketing module uses).
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          restaurantAdvanced: {
            ...restaurantAdvanced,
            popularityBonus: Math.round(clamp(safeNumber(restaurantAdvanced.popularityBonus, 0) + 8, 0, 30)),
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
