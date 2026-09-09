// Professional actions -- each is a pure (hotelBundle) =>
// nextHotelBundle transform, the same contract every business module's
// own *Actions.js already uses -- but a Pro action is a higher-level,
// strategic decision composing several underlying module actions at
// once (Finance/Staff/Marketing/ESG plus, unlike TFE, RM Advanced and
// Restaurant Advanced), matching the "gérer crises et opportunités
// stratégiques" framing of a professional playthrough.
import { safeObject } from "../safe";
import { applyFinancialDecision } from "../finance/financeEngine";
import { applyStaffDecision } from "../staff/staffEngine";
import { applyMarketingDecision } from "../marketing/marketingEngine";
import { applyEsgDecision } from "../esg/esgActions";
import { applyRmAdvancedDecision } from "../rmAdvanced/rmAdvancedActions";
import { applyRestaurantAdvancedDecision } from "../restaurantAdvanced/restaurantActions";

export const PRO_ACTION_CATALOG = [
  { id: "plan-relance-globale", category: "croissance", label: "Plan de relance globale", description: "Augmente le budget marketing et ajuste les prix à la hausse pour relancer l'activité." },
  { id: "plan-austerite", category: "rentabilite", label: "Plan d'austérité", description: "Réduit les charges fixes et le budget marketing pour préserver la trésorerie." },
  { id: "optimiser-distribution", category: "rm", label: "Optimiser la distribution", description: "Augmente l'ADR et réduit la dépendance OTA (actions RM avancé)." },
  { id: "optimiser-fb", category: "fb", label: "Optimiser le F&B", description: "Optimise la carte et réduit les pertes alimentaires (actions Restaurant avancé)." },
  { id: "investir-durable", category: "esg", label: "Investir dans le durable", description: "Renforce la démarche ESG et la réputation durable de l'établissement." },
  { id: "renforcer-equipe", category: "staff", label: "Renforcer l'équipe", description: "Augmente la masse salariale pour soulager une équipe en surcharge." },
  { id: "repositionner-etablissement", category: "marketing", label: "Repositionner l'établissement", description: "Fait évoluer le positionnement marketing vers une gamme différente." },
];

export function findProAction(actionId) {
  return PRO_ACTION_CATALOG.find((action) => action.id === actionId) || null;
}

export function applyProDecision(hotelBundle, actionId, payload = {}) {
  const bundle = safeObject(hotelBundle);

  switch (actionId) {
    case "plan-relance-globale":
      return applyFinancialDecision(applyMarketingDecision(bundle, "augmenter-budget", payload), "adjust-prices", { percent: 5 });

    case "plan-austerite":
      return applyFinancialDecision(applyMarketingDecision(bundle, "reduire-budget", payload), "reduce-costs", payload);

    case "optimiser-distribution":
      return applyRmAdvancedDecision(applyRmAdvancedDecision(bundle, "augmenter-adr", payload), "reduire-dependance-ota", payload);

    case "optimiser-fb":
      return applyRestaurantAdvancedDecision(applyRestaurantAdvancedDecision(bundle, "optimiser-carte", payload), "reduire-pertes", payload);

    case "investir-durable":
      return applyEsgDecision(applyEsgDecision(bundle, "ameliorer-reputation-durable", payload), "reduire-co2", payload);

    case "renforcer-equipe":
      return applyStaffDecision(bundle, "recruter", payload);

    case "repositionner-etablissement":
      return applyMarketingDecision(bundle, "repositionner-hotel", payload);

    default:
      return bundle;
  }
}

export const proActions = { PRO_ACTION_CATALOG, findProAction, applyProDecision };
export default proActions;
