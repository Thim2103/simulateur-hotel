// Housekeeping actions -- "réorganiser planning / réduire surcharge /
// augmenter staff / améliorer qualité / optimiser temps de nettoyage"
// (section 4). Each is a pure (hotelBundle) => nextHotelBundle
// transform, the same contract lib/finance/financeEngine.js's
// applyFinancialDecision()/lib/staff/staffEngine.js's
// applyStaffDecision()/lib/marketing/marketingEngine.js's
// applyMarketingDecision()/lib/esg/esgEngine.js's applyEsgDecision()
// use, so useHousekeepingEngine.js can drive it through useCareer.js's
// applyHotelAdjustment() exactly the way Finance/Staff/Marketing/ESG
// already do.
//
// These actions read/write a new, small hotelState.housekeeping object
// ({ staffingBonus, trainingLevel, processEfficiency }) -- additive,
// optional fields with sensible fallbacks (see
// housekeepingCalculations.js's resolveHousekeepingSettings()), the same
// "seed a new namespace lazily" approach lib/marketing/marketingActions
// .js took for hotelState.marketing.positioningTier.
import { safeNumber, safeObject } from "../safe";

const AVERAGE_HOTEL_STAFF_SALARY = 2600; // €/month, same assumption as lib/staff/staffCalculations.js

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export const HOUSEKEEPING_ACTION_CATALOG = [
  { id: "reorganiser-planning", category: "planning", label: "Réorganiser le planning", description: "Redistribue les tâches par priorité (arrivées d'abord) : +5 en efficacité de process." },
  { id: "reduire-surcharge", category: "overload", label: "Réduire la surcharge", description: "Fait appel à du renfort temporaire pour la journée." },
  { id: "augmenter-staff", category: "staffing", label: "Augmenter l'effectif", description: "Recrute un renfort permanent en housekeeping (coût récurrent)." },
  { id: "ameliorer-qualite", category: "quality", label: "Améliorer la qualité", description: "Programme de formation qualité : +8 sur le niveau de formation." },
  { id: "optimiser-temps-nettoyage", category: "efficiency", label: "Optimiser le temps de nettoyage", description: "Revoit les process de nettoyage : +8 en efficacité de process." },
];

export function findHousekeepingAction(actionId) {
  return HOUSEKEEPING_ACTION_CATALOG.find((action) => action.id === actionId) || null;
}

export function applyHousekeepingDecision(hotelBundle, actionId, payload = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const housekeeping = safeObject(hotelState.housekeeping);

  switch (actionId) {
    case "reorganiser-planning":
      return {
        ...bundle,
        hotelState: { ...hotelState, housekeeping: { ...housekeeping, processEfficiency: Math.round(clamp(safeNumber(housekeeping.processEfficiency, 50) + 5, 0, 100)) } },
      };

    case "reduire-surcharge":
      return {
        ...bundle,
        hotelState: { ...hotelState, housekeeping: { ...housekeeping, staffingBonus: safeNumber(housekeeping.staffingBonus, 0) + 1 } },
      };

    case "augmenter-staff":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          housekeeping: { ...housekeeping, staffingBonus: safeNumber(housekeeping.staffingBonus, 0) + 1 },
          finance: { ...safeObject(hotelState.finance), payroll: safeNumber(hotelState.finance?.payroll, 0) + safeNumber(payload.salary, AVERAGE_HOTEL_STAFF_SALARY) },
        },
      };

    case "ameliorer-qualite":
      return {
        ...bundle,
        hotelState: { ...hotelState, housekeeping: { ...housekeeping, trainingLevel: Math.round(clamp(safeNumber(housekeeping.trainingLevel, 50) + 8, 0, 100)) } },
      };

    case "optimiser-temps-nettoyage":
      return {
        ...bundle,
        hotelState: { ...hotelState, housekeeping: { ...housekeeping, processEfficiency: Math.round(clamp(safeNumber(housekeeping.processEfficiency, 50) + 8, 0, 100)) } },
      };

    default:
      return bundle;
  }
}
