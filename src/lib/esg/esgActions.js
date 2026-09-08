// ESG actions -- "réduire énergie / réduire eau / réduire déchets /
// réduire CO₂ / obtenir certification / améliorer réputation durable"
// (section 4). Each is a pure (hotelBundle) => nextHotelBundle
// transform, the same contract lib/finance/financeEngine.js's
// applyFinancialDecision()/lib/staff/staffEngine.js's
// applyStaffDecision()/lib/marketing/marketingEngine.js's
// applyMarketingDecision() use, so useEsgEngine.js can drive it through
// useCareer.js's applyHotelAdjustment() exactly the way Finance/Staff/
// Marketing already do.
import { safeArray, safeNumber, safeObject } from "../safe";
import { nextEligibleCertification } from "./esgCertifications";

const DEFAULT_INVESTMENT_STEP = 250;

export const ESG_ACTION_CATALOG = [
  { id: "reduire-energie", category: "energy", label: "Réduire la consommation d'énergie", description: "Investit dans l'efficacité énergétique : -8 sur le score de consommation, léger effet sur les charges fixes." },
  { id: "reduire-eau", category: "water", label: "Réduire la consommation d'eau", description: "Installe des équipements économes en eau : -8 sur le score de consommation d'eau." },
  { id: "reduire-dechets", category: "waste", label: "Réduire les déchets", description: "Programme de tri et de réduction des déchets : +8 sur les scores de réduction (hôtel + restaurant)." },
  { id: "reduire-co2", category: "co2", label: "Réduire les émissions de CO₂", description: "Combine sobriété énergétique et gestion des déchets pour réduire l'empreinte carbone." },
  { id: "obtenir-certification", category: "certification", label: "Obtenir une certification", description: "Engage les démarches pour la certification ESG la plus proche d'être obtenue." },
  { id: "ameliorer-reputation-durable", category: "reputation", label: "Améliorer la réputation durable", description: "Renforce le score de durabilité et le bien-être de l'équipe." },
];

export function findEsgAction(actionId) {
  return ESG_ACTION_CATALOG.find((action) => action.id === actionId) || null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// esgMetrics: the metrics nextEligibleCertification() needs (score,
// energy, water, waste, co2, hotelEsg, obtainedIds) -- computed by the
// caller (see esgEngine.js's applyEsgDecision() wrapper below, or
// hooks/useEsgEngine.js) since certification eligibility depends on the
// full current ESG cycle, not just the bundle being mutated.
export function applyEsgDecision(hotelBundle, actionId, payload = {}, esgMetrics = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const restaurantState = safeObject(bundle.restaurantState);
  const hotelEsg = safeObject(hotelState.esg);
  const restaurantEsg = safeObject(restaurantState.esg);

  switch (actionId) {
    case "reduire-energie":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          esg: { ...hotelEsg, energyConsumption: Math.round(clamp(safeNumber(hotelEsg.energyConsumption, 60) - 8, 0, 100)) },
          finance: { ...safeObject(hotelState.finance), fixedCosts: Math.max(0, safeNumber(hotelState.finance?.fixedCosts, 0) - safeNumber(payload.savings, 150)) },
        },
      };

    case "reduire-eau":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          esg: { ...hotelEsg, waterUsage: Math.round(clamp(safeNumber(hotelEsg.waterUsage, 55) - 8, 0, 100)) },
          finance: { ...safeObject(hotelState.finance), fixedCosts: Math.max(0, safeNumber(hotelState.finance?.fixedCosts, 0) - safeNumber(payload.savings, 80)) },
        },
      };

    case "reduire-dechets":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          esg: { ...hotelEsg, wasteReduction: Math.round(clamp(safeNumber(hotelEsg.wasteReduction, 40) + 8, 0, 100)) },
          finance: { ...safeObject(hotelState.finance), fixedCosts: Math.max(0, safeNumber(hotelState.finance?.fixedCosts, 0) - safeNumber(payload.savings, 60)) },
        },
        restaurantState: { ...restaurantState, esg: { ...restaurantEsg, wasteReduction: Math.round(clamp(safeNumber(restaurantEsg.wasteReduction, 35) + 8, 0, 100)) } },
      };

    case "reduire-co2":
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          esg: { ...hotelEsg, energyConsumption: Math.round(clamp(safeNumber(hotelEsg.energyConsumption, 60) - 5, 0, 100)) },
          finance: { ...safeObject(hotelState.finance), fixedCosts: Math.max(0, safeNumber(hotelState.finance?.fixedCosts, 0) - safeNumber(payload.savings, 100)) },
        },
        restaurantState: { ...restaurantState, esg: { ...restaurantEsg, energyEfficiency: Math.round(clamp(safeNumber(restaurantEsg.energyEfficiency, 50) + 6, 0, 100)) } },
      };

    case "obtenir-certification": {
      const target = payload.certificationId
        ? { id: payload.certificationId, eligible: true }
        : nextEligibleCertification(esgMetrics);
      if (!target || !target.eligible || safeArray(hotelEsg.certifications).includes(target.id)) return bundle;
      return { ...bundle, hotelState: { ...hotelState, esg: { ...hotelEsg, certifications: [...safeArray(hotelEsg.certifications), target.id] } } };
    }

    case "ameliorer-reputation-durable": {
      const investment = safeNumber(payload.amount, DEFAULT_INVESTMENT_STEP);
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          esg: { ...hotelEsg, sustainabilityScore: Math.round(clamp(safeNumber(hotelEsg.sustainabilityScore, 50) + 4, 0, 100)), monthlyInvestment: safeNumber(hotelEsg.monthlyInvestment, 0) + investment },
        },
        restaurantState: { ...restaurantState, esg: { ...restaurantEsg, staffWellbeing: Math.round(clamp(safeNumber(restaurantEsg.staffWellbeing, 60) + 5, 0, 100)) } },
      };
    }

    default:
      return bundle;
  }
}
