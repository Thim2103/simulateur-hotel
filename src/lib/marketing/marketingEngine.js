// Orchestrates the Marketing module: given the player's own hotel bundle
// ({ hotelState, restaurantState, rooms, reservations } -- the same shape
// runDailyCycle()/careerEngine.startCareer()/lib/guest/guestAdapter.js's
// createGuestHotelBundle() all share), computes one full marketing cycle
// (budget -> ROI -> conversion -> segments -> reputation -> positioning
// -> cross-selling -> diagnostics -> forecast), records it into the
// marketing replay log, and exposes the MARKETING_ACTION_CATALOG a player
// can apply to their own hotel bundle -- see marketingActions.js.
import { safeArray, safeNumber, safeObject } from "../safe";
import { computeBudget, computeConversion, computeROI, computeSegments, resolvePositioningTier } from "./marketingCalculations";
import { computeChannelPerformance, totalChannelReach } from "./marketingChannels";
import { computeCampaignPerformance } from "./marketingCampaigns";
import { computeMarketingReputation } from "./marketingReputation";
import { generateMarketingDiagnostics } from "./marketingDiagnostics";
import { generateMarketingForecast } from "./marketingForecast";
import { createMarketingState } from "./marketingState";
import { recordCycle } from "../scenario/scenarioReplay";
import { applyMarketingDecision, findMarketingAction, MARKETING_ACTION_CATALOG } from "./marketingActions";
import { staffFromCareerState } from "../staff/staffEngine";

function toDateOnly(referenceDate) {
  return String(referenceDate?.toISOString ? referenceDate.toISOString() : referenceDate).slice(0, 10);
}

function sum(values) {
  return (Array.isArray(values) ? values : []).reduce((total, value) => total + safeNumber(value, 0), 0);
}

// Restaurant cross-selling: the share of total revenue the restaurant
// contributes -- a simplified proxy (see this file's header) for "how
// many hotel guests are also buying F&B", since no per-guest purchase
// trace exists anywhere in the app (same limitation
// lib/finance/financeCalculations.js already documents).
function computeCrossSelling({ hotelFinance, restaurantFinance } = {}) {
  const hotelRevenue = sum(safeObject(hotelFinance).revenue);
  const restaurantRevenue = sum(safeObject(restaurantFinance).revenue);
  const total = hotelRevenue + restaurantRevenue;
  return total > 0 ? Math.round((restaurantRevenue / total) * 1000) / 10 : 0;
}

// 1-6. Runs one marketing cycle against the player's hotel bundle: pulls
// hotelState.marketing (channels/campaigns/budget/positioning) plus
// PMS rooms/reservations and restaurant/ESG figures, and builds
// everything a MarketingState needs on top of them.
export function runMarketingCycle({ hotelBundle, baseReputation = null, staffOverload = null, previousState = null, referenceDate = new Date() } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const restaurantState = safeObject(bundle.restaurantState);
  const marketing = safeObject(hotelState.marketing);
  const channels = safeArray(marketing.channels);
  const campaigns = safeArray(marketing.campaigns);
  const reservations = safeArray(bundle.reservations);
  const previous = safeObject(previousState);
  const cyclesElapsed = safeNumber(previous.cyclesElapsed, 0) + 1;

  const occupiedRooms = safeArray(bundle.rooms).filter((room) => String(room.status || "").toLowerCase() !== "libre").length;

  const budget = computeBudget({ channels, campaigns });
  const roi = computeROI({ campaigns, totalBudget: budget.total });
  const conversion = computeConversion({ channels, occupiedRooms });
  const segments = computeSegments(reservations);
  const positioningTier = resolvePositioningTier({ marketing, starRating: hotelState.structure?.starRating });
  const crossSelling = computeCrossSelling({ hotelFinance: hotelState.finance, restaurantFinance: restaurantState.finance });
  const reputation = computeMarketingReputation({
    baseReputation: baseReputation ?? previous.reputation ?? 60,
    sustainabilityScore: hotelState.esg?.sustainabilityScore,
    campaigns,
  });

  // Channels split the revenue campaigns actually generated (roi.
  // generatedRevenue, a marketing-scale figure), not the property's
  // whole hotelState.finance.revenue -- that array is a multi-month sum
  // Finance treats as one cycle's total hotel revenue (see
  // financeCalculations.js's computeIncomeStatement()), which would
  // swamp a channel's own small budget and produce a nonsensical
  // hundred-x ROI for every channel.
  const totalReach = totalChannelReach(channels);
  const channelsPerformance = computeChannelPerformance(channels, { totalRevenue: roi.generatedRevenue, totalReach });
  const campaignsPerformance = computeCampaignPerformance(campaigns);

  const diagnostics = generateMarketingDiagnostics({ budget, roi, conversion, reputation, channels, campaigns, staffOverload });

  const nextState = createMarketingState({
    period: toDateOnly(referenceDate),
    budget,
    roi,
    conversion,
    segments,
    reputation,
    positioningTier,
    channels: channelsPerformance,
    campaigns: campaignsPerformance,
    crossSelling,
    diagnostics,
    cyclesElapsed,
    replayLog: recordCycle(previous.replayLog, {
      cycleIndex: cyclesElapsed - 1,
      period: toDateOnly(referenceDate),
      budget,
      roi,
      conversion,
      reputation,
      positioningTier,
      diagnostics,
    }),
    lastUpdated: new Date().toISOString(),
  });

  const forecast = generateMarketingForecast(nextState);
  return { ...nextState, forecast };
}

// Career integration -- "synchroniser avec careerEngine" (section 1/5):
// builds a marketing cycle straight from a CareerState (see
// lib/career/careerState.js), also folding in the day's own reputation
// (progressionReport.reputation) and the Staff module's current overload
// (for the "surcharge liée aux campagnes" diagnostic) so Career mode
// feeds the same Marketing module a standalone (Guest Mode) session
// uses, without careerEngine.js needing to know anything about this
// module.
export function marketingFromCareerState(careerState, previousMarketingState = null) {
  const state = safeObject(careerState);
  const baseReputation = state.lastDayReport?.progressionReport?.reputation ?? null;
  const staff = state.hotel ? staffFromCareerState(state) : null;
  return runMarketingCycle({
    hotelBundle: state.hotel,
    baseReputation,
    staffOverload: staff?.overload ?? null,
    previousState: previousMarketingState,
  });
}

// Assembles the full marketing report MarketingReport.jsx shows, and
// adapts marketingDiagnostics.js's output into the same {type, severity,
// message} shape lib/analytics/analyticsDiagnostics.js uses --
// "intégrer les diagnostics marketing dans analyticsEngine" (section 5).
export function generateMarketingReport(marketingState) {
  const state = safeObject(marketingState);
  return {
    period: state.period,
    generatedAt: new Date().toISOString(),
    budget: state.budget,
    roi: state.roi,
    conversion: state.conversion,
    segments: state.segments,
    reputation: state.reputation,
    positioningTier: state.positioningTier,
    channels: safeArray(state.channels),
    campaigns: safeArray(state.campaigns),
    crossSelling: state.crossSelling,
    diagnostics: safeArray(state.diagnostics),
    forecast: state.forecast,
    replay: { totalCycles: safeArray(state.replayLog?.entries).length, entries: safeArray(state.replayLog?.entries) },
  };
}

export function marketingDiagnosticsToAnalytics(marketingDiagnostics) {
  return safeArray(marketingDiagnostics).map((entry) => ({ type: entry.type, severity: entry.severity, message: entry.message, cycleIndex: null }));
}

// EBITDA impact (section 5) is read directly by callers (e.g.
// dashboardEngine.js) from the Finance module itself (lib/finance/
// financeEngine.js's financeFromCareerState()) rather than duplicated
// inside MarketingState.
export { MARKETING_ACTION_CATALOG, findMarketingAction, applyMarketingDecision };

export const marketingEngine = {
  runMarketingCycle,
  marketingFromCareerState,
  generateMarketingReport,
  marketingDiagnosticsToAnalytics,
  applyMarketingDecision,
  findMarketingAction,
  MARKETING_ACTION_CATALOG,
};
export default marketingEngine;
