// HR actions -- "recruter / former / promouvoir / réorganiser / réduire
// surcharge / améliorer bien-être" (see the Refonte RH request's section
// 4). Each is a pure (hotelBundle) => nextHotelBundle transform, the same
// contract lib/finance/financeEngine.js's applyFinancialDecision() and
// lib/dashboard/dashboardActions.js's applyQuickAction() use, so
// useStaffEngine.js can drive it through useCareer.js's
// applyHotelAdjustment() exactly the way Finance/Dashboard already do.
import { safeArray, safeNumber, safeObject, safeString } from "../safe";

const AVERAGE_HOTEL_STAFF_SALARY = 2600; // €/month, same assumption as staffCalculations.js
const NEW_HIRE_SALARY = 2200;

export const STAFF_ACTION_CATALOG = [
  { id: "recruter", category: "headcount", label: "Recruter", description: "Embauche un nouveau collaborateur (restaurant) et renforce l'équipe hôtel (+1 poste équivalent)." },
  { id: "former", category: "training", label: "Former l'équipe", description: "Programme de formation : +8 productivité pour toute l'équipe (coût ponctuel)." },
  { id: "promouvoir", category: "promotion", label: "Promouvoir", description: "Promeut le collaborateur le plus performant : +15% de salaire, +10 moral." },
  { id: "reorganiser", category: "organization", label: "Réorganiser", description: "Réorganise les plannings : +5 moral pour l'équipe, renforce partiellement la capacité hôtel." },
  { id: "reduire-surcharge", category: "overload", label: "Réduire la surcharge", description: "Fait appel à du renfort temporaire pour soulager l'équipe en place." },
  { id: "ameliorer-bien-etre", category: "wellbeing", label: "Améliorer le bien-être", description: "Investit dans le bien-être au travail : +10 sur le score ESG bien-être." },
];

export function findStaffAction(actionId) {
  return STAFF_ACTION_CATALOG.find((action) => action.id === actionId) || null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function adjustEveryStaffMember(restaurantStaff, transform) {
  return safeArray(restaurantStaff).map((person) => transform(safeObject(person)));
}

export function applyStaffDecision(hotelBundle, actionId, payload = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const restaurantState = safeObject(bundle.restaurantState);
  const restaurantStaff = safeArray(restaurantState.staff);

  switch (actionId) {
    case "recruter": {
      const newHire = {
        id: `staff-${Date.now()}`,
        name: safeString(payload.name, "Nouveau collaborateur"),
        role: "Polyvalent",
        department: "Service",
        salary: safeNumber(payload.salary, NEW_HIRE_SALARY),
        skills: [],
        productivity: 65,
        satisfaction: 70,
      };
      return {
        ...bundle,
        hotelState: { ...hotelState, finance: { ...safeObject(hotelState.finance), payroll: safeNumber(hotelState.finance?.payroll, 0) + AVERAGE_HOTEL_STAFF_SALARY } },
        restaurantState: { ...restaurantState, staff: [...restaurantStaff, newHire] },
      };
    }
    case "former": {
      const trainedStaff = adjustEveryStaffMember(restaurantStaff, (person) => ({ ...person, productivity: Math.round(clamp(safeNumber(person.productivity, 65) + 8, 0, 100)) }));
      return {
        ...bundle,
        restaurantState: {
          ...restaurantState,
          staff: trainedStaff,
          finance: { ...safeObject(restaurantState.finance), fixedCosts: safeNumber(restaurantState.finance?.fixedCosts, 0) + safeNumber(payload.amount, 400) },
        },
      };
    }
    case "promouvoir": {
      if (!restaurantStaff.length) return bundle;
      const topPerformerId = restaurantStaff.reduce((best, person) => (safeNumber(person.productivity, 0) > safeNumber(best.productivity, 0) ? person : best), restaurantStaff[0]).id;
      const promotedStaff = restaurantStaff.map((person) =>
        person.id === topPerformerId
          ? { ...person, salary: Math.round(safeNumber(person.salary, 0) * 1.15), satisfaction: Math.round(clamp(safeNumber(person.satisfaction, 70) + 10, 0, 100)) }
          : person
      );
      return { ...bundle, restaurantState: { ...restaurantState, staff: promotedStaff } };
    }
    case "reorganiser": {
      const reorganizedStaff = adjustEveryStaffMember(restaurantStaff, (person) => ({ ...person, satisfaction: Math.round(clamp(safeNumber(person.satisfaction, 70) + 5, 0, 100)) }));
      return {
        ...bundle,
        hotelState: { ...hotelState, finance: { ...safeObject(hotelState.finance), payroll: safeNumber(hotelState.finance?.payroll, 0) + Math.round(AVERAGE_HOTEL_STAFF_SALARY * 0.5) } },
        restaurantState: { ...restaurantState, staff: reorganizedStaff },
      };
    }
    case "reduire-surcharge":
      return {
        ...bundle,
        hotelState: { ...hotelState, finance: { ...safeObject(hotelState.finance), payroll: safeNumber(hotelState.finance?.payroll, 0) + Math.round(AVERAGE_HOTEL_STAFF_SALARY * 0.75) } },
      };
    case "ameliorer-bien-etre": {
      const investment = safeNumber(payload.amount, 300);
      return {
        ...bundle,
        hotelState: { ...hotelState, esg: { ...safeObject(hotelState.esg), sustainabilityScore: Math.round(clamp(safeNumber(hotelState.esg?.sustainabilityScore, 0) + 3, 0, 100)) } },
        restaurantState: {
          ...restaurantState,
          esg: {
            ...safeObject(restaurantState.esg),
            staffWellbeing: Math.round(clamp(safeNumber(restaurantState.esg?.staffWellbeing, 60) + 10, 0, 100)),
            monthlyInvestment: safeNumber(restaurantState.esg?.monthlyInvestment, 0) + investment,
          },
        },
      };
    }
    default:
      return bundle;
  }
}
