// Clients actions -- "améliorer satisfaction / résoudre plaintes /
// améliorer fidélité / optimiser segments / améliorer réputation"
// (section 4). Each is a pure (hotelBundle) => nextHotelBundle
// transform, same contract as housekeepingActions.js / esgActions.js.
//
// These actions seed a new hotelState.clients namespace (additive,
// optional, with sensible fallbacks) -- the same "lazy namespace" pattern
// lib/marketing/marketingActions.js used for hotelState.marketing and
// lib/housekeeping/housekeepingActions.js used for hotelState.housekeeping.
import { safeNumber, safeObject } from "../safe";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export const CLIENTS_ACTION_CATALOG = [
  {
    id: "ameliorer-accueil",
    category: "satisfaction",
    label: "Améliorer l'accueil",
    description: "Formation accueil et hospitalité pour le personnel front-desk : +8 sur le score service client.",
  },
  {
    id: "resoudre-plaintes",
    category: "satisfaction",
    label: "Résoudre les plaintes",
    description: "Processus de gestion des plaintes accéléré : réduit l'impact des avis négatifs.",
  },
  {
    id: "programme-fidelite",
    category: "loyalty",
    label: "Lancer un programme fidélité",
    description: "Carte membre et avantages exclusifs : +10 sur le score de fidélité.",
  },
  {
    id: "optimiser-mix-segments",
    category: "segments",
    label: "Optimiser le mix segments",
    description: "Repositionne l'offre tarifaire pour équilibrer les segments clients.",
  },
  {
    id: "campagne-reputation",
    category: "reputation",
    label: "Campagne réputation",
    description: "Actions proactives de collecte d'avis positifs et de réponse aux avis négatifs.",
  },
];

export function findClientsAction(actionId) {
  return CLIENTS_ACTION_CATALOG.find((action) => action.id === actionId) || null;
}

export function applyClientsDecision(hotelBundle, actionId, payload = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const clients = safeObject(hotelState.clients);
  const marketing = safeObject(hotelState.marketing);

  switch (actionId) {
    case "ameliorer-accueil":
      // Boosts the client service score (stored on hotelState.clients)
      // and feeds through to satisfaction via staffMorale pathway.
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          clients: {
            ...clients,
            serviceScore: Math.round(clamp(safeNumber(clients.serviceScore, 50) + 8, 0, 100)),
          },
        },
      };

    case "resoudre-plaintes":
      // Marks all pending complaints as being resolved; lowers the
      // complaint weight in the satisfaction computation next cycle.
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          clients: {
            ...clients,
            complaintResolutionRate: Math.round(clamp(safeNumber(clients.complaintResolutionRate, 50) + 15, 0, 100)),
          },
        },
      };

    case "programme-fidelite":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          clients: {
            ...clients,
            loyaltyBonus: Math.round(clamp(safeNumber(clients.loyaltyBonus, 0) + 10, 0, 30)),
          },
        },
      };

    case "optimiser-mix-segments":
      // Slightly diversifies the RM segmentation by nudging away from
      // the dominant segment (stored as a flag; clientsEngine reads it).
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          clients: {
            ...clients,
            segmentDiversificationBonus: Math.round(clamp(safeNumber(clients.segmentDiversificationBonus, 0) + 5, 0, 20)),
          },
        },
      };

    case "campagne-reputation":
      // Boosts the marketing reputation score (same namespace marketing
      // module uses) plus a direct client-review lift.
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          marketing: {
            ...marketing,
            reputationBonus: Math.round(clamp(safeNumber(marketing.reputationBonus, 0) + 8, 0, 30)),
          },
          clients: {
            ...clients,
            reviewBonus: Math.round(clamp(safeNumber(clients.reviewBonus, 0) + 5, 0, 20)),
          },
        },
      };

    default:
      return bundle;
  }
}
