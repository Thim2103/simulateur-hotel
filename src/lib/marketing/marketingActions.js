// Marketing actions -- "lancer campagne / augmenter budget / réduire
// budget / changer canal / repositionner hôtel / améliorer réputation"
// (section 4). Each is a pure (hotelBundle) => nextHotelBundle transform,
// the same contract lib/finance/financeEngine.js's applyFinancialDecision
// () and lib/staff/staffEngine.js's applyStaffDecision() use, so
// useMarketingEngine.js can drive it through useCareer.js's
// applyHotelAdjustment() exactly the way Finance/Staff already do.
import { safeArray, safeNumber, safeObject } from "../safe";
import { launchCampaign as launchCampaignPure } from "./marketingCampaigns";
import { rebalanceChannels } from "./marketingChannels";
import { nextPositioningTier, resolvePositioningTier } from "./marketingCalculations";

const DEFAULT_BUDGET_STEP = 500;
const DEFAULT_WELLBEING_INVESTMENT = 300;

export const MARKETING_ACTION_CATALOG = [
  { id: "lancer-campagne", category: "campaign", label: "Lancer une campagne", description: "Lance une nouvelle campagne d'acquisition (1 500 € de budget)." },
  { id: "augmenter-budget", category: "budget", label: "Augmenter le budget", description: "Ajoute 500 € au canal le plus performant." },
  { id: "reduire-budget", category: "budget", label: "Réduire le budget", description: "Retire 500 € au canal le moins performant." },
  { id: "changer-canal", category: "channel", label: "Rééquilibrer les canaux", description: "Déplace du budget du canal le plus faible vers le plus fort." },
  { id: "repositionner-hotel", category: "positioning", label: "Repositionner l'établissement", description: "Fait évoluer le positionnement (budget → midscale → upscale → luxury)." },
  { id: "ameliorer-reputation", category: "reputation", label: "Améliorer la réputation", description: "Investit dans la démarche durable (ESG) pour soutenir la réputation." },
];

export function findMarketingAction(actionId) {
  return MARKETING_ACTION_CATALOG.find((action) => action.id === actionId) || null;
}

function strongestChannel(channels) {
  const enabled = safeArray(channels).filter((channel) => channel.enabled !== false);
  if (!enabled.length) return null;
  return enabled.reduce((best, channel) => (safeNumber(channel.reach, 0) > safeNumber(best.reach, 0) ? channel : best), enabled[0]);
}

function weakestChannel(channels) {
  const enabled = safeArray(channels).filter((channel) => channel.enabled !== false);
  if (!enabled.length) return null;
  return enabled.reduce((worst, channel) => (safeNumber(channel.reach, 0) < safeNumber(worst.reach, 0) ? channel : worst), enabled[0]);
}

export function applyMarketingDecision(hotelBundle, actionId, payload = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const marketing = safeObject(hotelState.marketing);
  const channels = safeArray(marketing.channels);
  const campaigns = safeArray(marketing.campaigns);

  switch (actionId) {
    case "lancer-campagne":
      return { ...bundle, hotelState: { ...hotelState, marketing: { ...marketing, campaigns: launchCampaignPure(campaigns, payload) } } };

    case "augmenter-budget": {
      const target = strongestChannel(channels);
      if (!target) return bundle;
      const nextChannels = channels.map((channel) =>
        channel.id === target.id ? { ...channel, budget: safeNumber(channel.budget, 0) + safeNumber(payload.amount, DEFAULT_BUDGET_STEP) } : channel
      );
      return { ...bundle, hotelState: { ...hotelState, marketing: { ...marketing, budget: safeNumber(marketing.budget, 0) + safeNumber(payload.amount, DEFAULT_BUDGET_STEP), channels: nextChannels } } };
    }

    case "reduire-budget": {
      const target = weakestChannel(channels);
      if (!target) return bundle;
      const amount = safeNumber(payload.amount, DEFAULT_BUDGET_STEP);
      const nextChannels = channels.map((channel) =>
        channel.id === target.id ? { ...channel, budget: Math.max(0, safeNumber(channel.budget, 0) - amount) } : channel
      );
      return { ...bundle, hotelState: { ...hotelState, marketing: { ...marketing, budget: Math.max(0, safeNumber(marketing.budget, 0) - amount), channels: nextChannels } } };
    }

    case "changer-canal":
      return { ...bundle, hotelState: { ...hotelState, marketing: { ...marketing, channels: rebalanceChannels(channels) } } };

    case "repositionner-hotel": {
      const currentTier = resolvePositioningTier({ marketing, starRating: hotelState.structure?.starRating });
      return { ...bundle, hotelState: { ...hotelState, marketing: { ...marketing, positioningTier: nextPositioningTier(currentTier) } } };
    }

    case "ameliorer-reputation": {
      const investment = safeNumber(payload.amount, DEFAULT_WELLBEING_INVESTMENT);
      const esg = safeObject(hotelState.esg);
      return {
        ...bundle,
        hotelState: {
          ...hotelState,
          esg: { ...esg, sustainabilityScore: Math.min(100, safeNumber(esg.sustainabilityScore, 0) + 3), monthlyInvestment: safeNumber(esg.monthlyInvestment, 0) + investment },
        },
      };
    }

    default:
      return bundle;
  }
}
