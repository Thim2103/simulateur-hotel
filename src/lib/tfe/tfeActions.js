// TFE actions -- "Section 'Actions TFE'" (section 4). Each is a pure
// (hotelBundle) => nextHotelBundle transform, the same contract every
// business module's own *Actions.js already uses -- but a TFE action is
// a higher-level, strategic decision that composes several of those
// underlying module actions at once, matching the "gérer crises et
// opportunités" framing of a TFE playthrough rather than the
// day-to-day operational actions each business dashboard already
// exposes on its own.
import { safeObject } from "../safe";
import { applyFinancialDecision } from "../finance/financeEngine";
import { applyStaffDecision } from "../staff/staffEngine";
import { applyMarketingDecision } from "../marketing/marketingEngine";
import { applyEsgDecision } from "../esg/esgActions";

export const TFE_ACTION_CATALOG = [
  { id: "plan-relance", category: "croissance", label: "Plan de relance", description: "Augmente le budget marketing et ajuste les prix à la hausse pour relancer l'activité." },
  { id: "plan-austerite", category: "rentabilite", label: "Plan d'austérité", description: "Réduit les charges fixes et le budget marketing pour préserver la trésorerie." },
  { id: "investir-durable", category: "esg", label: "Investir dans le durable", description: "Renforce la démarche ESG et la réputation durable de l'établissement." },
  { id: "renforcer-equipe", category: "staff", label: "Renforcer l'équipe", description: "Augmente la masse salariale pour soulager une équipe en surcharge." },
  { id: "repositionner-etablissement", category: "marketing", label: "Repositionner l'établissement", description: "Fait évoluer le positionnement marketing vers une gamme différente." },
];

export function findTfeAction(actionId) {
  return TFE_ACTION_CATALOG.find((action) => action.id === actionId) || null;
}

export function applyTfeDecision(hotelBundle, actionId, payload = {}) {
  const bundle = safeObject(hotelBundle);

  switch (actionId) {
    case "plan-relance":
      return applyFinancialDecision(applyMarketingDecision(bundle, "augmenter-budget", payload), "adjust-prices", { percent: 5 });

    case "plan-austerite":
      return applyFinancialDecision(applyMarketingDecision(bundle, "reduire-budget", payload), "reduce-costs", payload);

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
