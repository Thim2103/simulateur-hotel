// Quick actions: small, real adjustments to the player's own hotel bundle
// (the same { hotelState, restaurantState, rooms, reservations } shape
// runDailyCycle()/careerEngine.js pass around), triggerable straight from
// the Dashboard instead of navigating to Marketing/Staff/PMS. Every
// action here is a pure function -- applying it just returns a new hotel
// bundle; useCareer.js's applyHotelAdjustment() (see hooks/useCareer.js)
// is what actually stores and persists the result.
import { safeArray, safeNumber, safeObject } from "../safe";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export const QUICK_ACTION_CATALOG = [
  {
    id: "increase-prices",
    category: "pricing",
    label: "Augmenter les prix de 5 %",
    description: "Ajuste le prix de toutes les réservations actives à la hausse.",
  },
  {
    id: "decrease-prices",
    category: "pricing",
    label: "Baisser les prix de 5 %",
    description: "Ajuste le prix de toutes les réservations actives à la baisse pour relancer la demande.",
  },
  {
    id: "boost-staff-morale",
    category: "staff",
    label: "Organiser une prime d'équipe",
    description: "Augmente la satisfaction de l'équipe du restaurant.",
  },
  {
    id: "increase-marketing",
    category: "marketing",
    label: "Augmenter le budget marketing",
    description: "Ajoute 500 € au budget marketing mensuel de l'hôtel.",
  },
  {
    id: "schedule-maintenance",
    category: "operations",
    label: "Planifier une maintenance préventive",
    description: "Ajoute une tâche de maintenance aux opérations du restaurant.",
  },
];

export function findQuickAction(actionId) {
  return QUICK_ACTION_CATALOG.find((action) => action.id === actionId) || null;
}

function adjustPrices(bundle, percent) {
  const reservations = safeArray(bundle.reservations).map((reservation) => ({
    ...reservation,
    price: Math.max(0, Math.round(safeNumber(reservation.price, 0) * (1 + percent / 100))),
  }));
  return { ...bundle, reservations };
}

function boostStaffMorale(bundle, amount) {
  const restaurantState = safeObject(bundle.restaurantState);
  const staff = safeArray(restaurantState.staff).map((member) => ({
    ...member,
    satisfaction: clamp(safeNumber(member.satisfaction, 0) + amount, 0, 100),
  }));
  return { ...bundle, restaurantState: { ...restaurantState, staff } };
}

function adjustMarketingBudget(bundle, amount) {
  const hotelState = safeObject(bundle.hotelState);
  const marketing = safeObject(hotelState.marketing);
  return { ...bundle, hotelState: { ...hotelState, marketing: { ...marketing, budget: Math.max(0, safeNumber(marketing.budget, 0) + amount) } } };
}

function scheduleMaintenance(bundle) {
  const restaurantState = safeObject(bundle.restaurantState);
  const operations = safeArray(restaurantState.operations);
  const task = { id: `maintenance-${Date.now()}`, type: "maintenance", status: "scheduled", createdAt: new Date().toISOString() };
  return { ...bundle, restaurantState: { ...restaurantState, operations: [...operations, task] } };
}

// Applies one quick action to a hotel bundle, returning a new bundle --
// never mutates its input, same contract as every other engine function
// in this codebase.
export function applyQuickAction(hotelBundle, actionId, payload = {}) {
  const bundle = safeObject(hotelBundle);
  switch (actionId) {
    case "increase-prices":
      return adjustPrices(bundle, safeNumber(payload.percent, 5));
    case "decrease-prices":
      return adjustPrices(bundle, -safeNumber(payload.percent, 5));
    case "boost-staff-morale":
      return boostStaffMorale(bundle, safeNumber(payload.amount, 10));
    case "increase-marketing":
      return adjustMarketingBudget(bundle, safeNumber(payload.amount, 500));
    case "schedule-maintenance":
      return scheduleMaintenance(bundle);
    default:
      return bundle;
  }
}
