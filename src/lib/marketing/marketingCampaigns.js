// Campaign management -- the hotelState.marketing.campaigns array the
// old Marketing.jsx page already edited (see lib/hotel.js's
// hotelMarketing.campaigns), with the read-side helpers
// pages/MarketingCampaigns.jsx needs (performance, ROI) and the
// write-side helpers marketingActions.js's "lancer campagne" action uses.
import { safeArray, safeNumber, safeObject, safeString } from "../safe";

const CAMPAIGN_OBJECTIVES = ["Acquisition", "Fidélisation", "Notoriété"];
const DEFAULT_CAMPAIGN_BUDGET = 1500;

export function computeCampaignPerformance(campaigns) {
  return safeArray(campaigns).map((campaign) => {
    const budget = safeNumber(campaign.budget, 0);
    const roi = safeNumber(campaign.roi, 0);
    const generatedRevenue = Math.round(budget * roi);
    const netResult = Math.round(generatedRevenue - budget);
    return { ...campaign, generatedRevenue, netResult };
  });
}

export function launchCampaign(campaigns, definition = {}) {
  const list = safeArray(campaigns);
  const nextId = list.reduce((max, campaign) => Math.max(max, safeNumber(campaign.id, 0)), 0) + 1;
  const campaign = {
    id: nextId,
    name: safeString(definition.name, `Campagne ${nextId}`),
    objective: CAMPAIGN_OBJECTIVES.includes(definition.objective) ? definition.objective : "Acquisition",
    status: "active",
    budget: safeNumber(definition.budget, DEFAULT_CAMPAIGN_BUDGET),
    conversion: safeNumber(definition.conversion, 5),
    roi: safeNumber(definition.roi, 1.5),
    demandUplift: safeNumber(definition.demandUplift, 4),
  };
  return [...list, campaign];
}

export function updateCampaignStatus(campaigns, campaignId, status) {
  return safeArray(campaigns).map((campaign) => (String(campaign.id) === String(campaignId) ? { ...campaign, status } : campaign));
}

export function removeCampaign(campaigns, campaignId) {
  return safeArray(campaigns).filter((campaign) => String(campaign.id) !== String(campaignId));
}

export function activeCampaigns(campaigns) {
  return safeArray(campaigns).filter((campaign) => campaign.status === "active");
}

export function totalCampaignBudget(campaigns) {
  return Math.round(safeArray(campaigns).reduce((total, campaign) => total + safeNumber(campaign.budget, 0), 0));
}

export { CAMPAIGN_OBJECTIVES, DEFAULT_CAMPAIGN_BUDGET };

// re-exported for callers that only need the shape check, e.g. tests
export function isValidCampaign(campaign) {
  return Boolean(safeObject(campaign).id);
}
