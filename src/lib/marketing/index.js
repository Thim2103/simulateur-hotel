export { createMarketingState } from "./marketingState";
export { computeBudget, computeROI, computeConversion, computeSegments, derivePositioningTier, resolvePositioningTier, nextPositioningTier, POSITIONING_TIERS } from "./marketingCalculations";
export { generateMarketingDiagnostics } from "./marketingDiagnostics";
export { generateMarketingForecast } from "./marketingForecast";
export { CHANNEL_CATALOG, computeChannelPerformance, toggleChannel, adjustChannelBudget, rebalanceChannels, totalChannelReach } from "./marketingChannels";
export { CAMPAIGN_OBJECTIVES, computeCampaignPerformance, launchCampaign, updateCampaignStatus, removeCampaign, activeCampaigns, totalCampaignBudget } from "./marketingCampaigns";
export { computeMarketingReputation, reputationTrend, reputationTier, durableReputationBonus } from "./marketingReputation";
export { MARKETING_ACTION_CATALOG, findMarketingAction, applyMarketingDecision } from "./marketingActions";
export {
  runMarketingCycle,
  marketingFromCareerState,
  generateMarketingReport,
  marketingDiagnosticsToAnalytics,
  marketingEngine,
} from "./marketingEngine";
