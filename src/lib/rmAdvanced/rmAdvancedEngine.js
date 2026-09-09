// Orchestrates the RM Advanced module: given the player's own hotel
// bundle ({ hotelState, rooms, reservations, ... }) plus the other
// modules' own computed outputs (restaurant demand, staff overload, ESG
// score, marketing reputation, guest satisfaction), computes one full RM
// Advanced cycle (compression -> displacement -> pick-up curves -> OTA
// strategy -> special pricing -> diagnostics), records it into the RM
// Advanced replay log, and exposes the RM_ADVANCED_ACTION_CATALOG a
// player can apply to their own hotel bundle -- see rmAdvancedActions.js.
//
// "synchroniser avec careerEngine": rmAdvancedFromCareerState() builds a
// cycle straight from a CareerState (see lib/career/careerState.js),
// folding in every other module's own computed values without
// careerEngine.js needing to know about this module -- same integration
// pattern lib/clients/clientsEngine.js / lib/restaurantAdvanced/
// restaurantAdvancedEngine.js already established.
import { safeArray, safeNumber, safeObject } from "../safe";
import { channelYield } from "../calculs/rm";
import { computeCompression } from "./rmAdvancedCompression";
import { computeDisplacement } from "./rmAdvancedDisplacement";
import { computePickupCurves } from "./rmAdvancedPickup";
import { generateRmAdvancedDiagnostics } from "./rmAdvancedDiagnostics";
import { generateRmAdvancedForecast } from "./rmAdvancedForecast";
import { createRmAdvancedState } from "./rmAdvancedState";
import { recordCycle } from "../scenario/scenarioReplay";
import { applyRmAdvancedDecision, findRmAdvancedAction, RM_ADVANCED_ACTION_CATALOG } from "./rmAdvancedActions";
import { staffFromCareerState } from "../staff/staffEngine";
import { marketingFromCareerState } from "../marketing/marketingEngine";

function toDateOnly(referenceDate) {
  return String(referenceDate?.toISOString ? referenceDate.toISOString() : referenceDate).slice(0, 10);
}

// Reads the RM-Advanced-specific settings from hotelState.rmAdvanced
// (lazily seeded by rmAdvancedActions.js). Returns sensible defaults
// when the namespace doesn't exist yet.
function resolveRmAdvancedSettings(hotelState) {
  const state = safeObject(hotelState);
  const rmAdvanced = safeObject(state.rmAdvanced);
  return {
    adrBonus: safeNumber(rmAdvanced.adrBonus, 0),
    mixOptimizationBonus: safeNumber(rmAdvanced.mixOptimizationBonus, 0),
    directBookingBonus: safeNumber(rmAdvanced.directBookingBonus, 0),
    eventPricingBonus: safeNumber(rmAdvanced.eventPricingBonus, 0),
    corporatePremiumBonus: safeNumber(rmAdvanced.corporatePremiumBonus, 0),
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Builds the OTA-vs-direct strategy view on top of calculs/rm.js's own
// channelYield() -- reused rather than reimplemented, so both stay
// consistent -- then applies the "réduire dépendance OTA" bonus as a
// share shift (never rewrites the underlying reservations/revenue).
function buildOtaStrategy({ reservations, compression, directBookingBonus }) {
  const channels = channelYield(reservations, compression?.avgCompression ?? 50);
  const totalRoomNights = Object.values(channels).reduce((sum, channel) => sum + safeNumber(channel.roomNights, 0), 0);

  const rawOtaShare = totalRoomNights ? (safeNumber(channels.ota?.roomNights, 0) / totalRoomNights) * 100 : 0;
  const rawDirectShare = totalRoomNights ? (safeNumber(channels.direct?.roomNights, 0) / totalRoomNights) * 100 : 0;

  const shift = directBookingBonus * 0.5;
  const otaShare = totalRoomNights ? Math.round(clamp(rawOtaShare - shift, 0, 100)) : null;
  const directShare = totalRoomNights ? Math.round(clamp(rawDirectShare + shift, 0, 100)) : null;

  const netAdrByChannel = Object.fromEntries(
    Object.entries(channels).map(([name, channel]) => [
      name,
      channel.roomNights ? Math.round(channel.netRevenue / channel.roomNights) : 0,
    ])
  );

  return { otaShare, directShare, channels, netAdrByChannel };
}

// Event/corporate/premium/long-stay pricing overlays -- derived from the
// direct channel's own BAR rate (see channelYield()) plus the player's
// own action bonuses. Restaurant demand nudges the premium rate: a busy
// F&B outlet signals a stronger overall on-property experience, worth a
// small uplift on the bundled premium rate.
function buildSpecialPricing({ otaStrategy, settings, restaurantDemand }) {
  const barRate = otaStrategy.channels?.direct?.barRate || otaStrategy.channels?.direct?.adr || 100;
  const adrMultiplier = 1 + settings.adrBonus / 100;
  const eventMultiplier = 1 + settings.eventPricingBonus / 100;
  const restaurantUplift = restaurantDemand !== null ? Math.min(0.08, Math.max(0, (safeNumber(restaurantDemand, 50) - 50) / 500)) : 0;

  return {
    events: [],
    corporateRate: Math.round(barRate * 0.9 * adrMultiplier * (1 + settings.corporatePremiumBonus / 200)),
    premiumRate: Math.round(barRate * 1.2 * adrMultiplier * (1 + settings.corporatePremiumBonus / 150) * (1 + restaurantUplift)),
    longStayRate: Math.round(barRate * 0.85 * adrMultiplier),
    eventRate: Math.round(barRate * eventMultiplier),
  };
}

// Runs one RM Advanced cycle against the player's hotel bundle.
export function runRmAdvancedCycle({
  hotelBundle,
  restaurantDemand = null, // 0-100 (Restaurant integration)
  staffOverload = null, // 0-100 (Staff integration)
  esgScore = null, // 0-100 (ESG integration)
  marketingReputation = null, // 0-100 (Marketing integration)
  clientsSatisfaction = null, // 0-100 (Clients integration)
  previousState = null,
  referenceDate = new Date(),
} = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const settings = resolveRmAdvancedSettings(hotelState);
  const previous = safeObject(previousState);
  const cyclesElapsed = safeNumber(previous.cyclesElapsed, 0) + 1;
  const rooms = safeArray(bundle.rooms, []);
  const reservations = safeArray(bundle.reservations, []);

  // 1. Compression (PMS integration: rooms/reservations).
  const compression = computeCompression({ rooms, reservations, referenceDate });

  // 2. Displacement, eased by "optimiser le mix segments".
  const rawDisplacement = computeDisplacement({ reservations, compression });
  const displacementFactor = 1 - Math.min(0.6, settings.mixOptimizationBonus / 100);
  const displacement = {
    bySegment: Object.fromEntries(
      Object.entries(rawDisplacement.bySegment).map(([segment, loss]) => [segment, Math.round(loss * displacementFactor)])
    ),
    totalLoss: Math.round(rawDisplacement.totalLoss * displacementFactor),
    worstDates: rawDisplacement.worstDates.map((entry) => ({ ...entry, loss: Math.round(entry.loss * displacementFactor) })),
  };

  // 3. Pick-up curves.
  const pickupCurves = computePickupCurves({ reservations, referenceDate });

  // 4. OTA vs direct strategy.
  const otaStrategy = buildOtaStrategy({ reservations, compression, directBookingBonus: settings.directBookingBonus });

  // 5. Special pricing (events/corporate/premium/long-stay), folding in
  // Restaurant's own demand signal.
  const specialPricing = buildSpecialPricing({ otaStrategy, settings, restaurantDemand });

  // 6. Diagnostics (Staff/ESG/Clients/Marketing integrations).
  const diagnostics = generateRmAdvancedDiagnostics({
    compression,
    displacement,
    pickupCurves,
    otaStrategy,
    staffOverload,
    esgScore,
    clientsSatisfaction,
    marketingReputation,
  });

  const nextState = createRmAdvancedState({
    period: toDateOnly(referenceDate),
    compression,
    displacement,
    pickupCurves,
    otaStrategy,
    specialPricing,
    diagnostics,
    cyclesElapsed,
    replayLog: recordCycle(previous.replayLog, {
      cycleIndex: cyclesElapsed - 1,
      period: toDateOnly(referenceDate),
      avgCompression: compression.avgCompression,
      totalDisplacementLoss: displacement.totalLoss,
      otaShare: otaStrategy.otaShare,
      diagnostics,
    }),
    lastUpdated: new Date().toISOString(),
  });

  // 7. Forecast.
  const forecast = generateRmAdvancedForecast(nextState);
  return { ...nextState, forecast };
}

// Career integration -- builds an RM Advanced cycle straight from a
// CareerState, pulling Staff/Marketing's own outputs via their
// *FromCareerState() adapters, and reading ESG/Clients state directly
// off the hotel bundle -- same integration pattern as
// clientsFromCareerState()/restaurantAdvancedFromCareerState().
export function rmAdvancedFromCareerState(careerState, previousState = null) {
  const state = safeObject(careerState);
  const staff = state.hotel ? staffFromCareerState(state) : null;
  const marketing = state.hotel ? marketingFromCareerState(state) : null;

  // Restaurant demand, straight off today's restaurant report (same
  // field restaurant/restaurantEngine.js's own report exposes).
  const restaurantDemand = state.lastDayReport?.restaurantReport?.demand ?? null;

  // ESG score, straight off the hotel's own ESG state (same field
  // clientsFromCareerState() reads for its own ESG score).
  const hotelEsg = safeObject(state.hotel?.hotelState?.esg);
  const esgScore = hotelEsg.overallScore ?? hotelEsg.score ?? null;

  // Clients satisfaction: prefer the Clients module's own persisted
  // score if the hotel bundle carries it, otherwise fall back to today's
  // restaurant customer-satisfaction rating (1-5 -> 0-100), the same
  // signal restaurantAdvancedFromCareerState() uses for its own fallback.
  const rawClientsSatisfaction = state.hotel?.hotelState?.clients?.satisfaction;
  const rawRestaurantRating = state.lastDayReport?.restaurantReport?.customerSatisfaction;
  const clientsSatisfaction =
    rawClientsSatisfaction ?? (rawRestaurantRating !== undefined && rawRestaurantRating !== null
      ? Math.round(((safeNumber(rawRestaurantRating, 0) - 1) / 4) * 100)
      : null);

  return runRmAdvancedCycle({
    hotelBundle: state.hotel,
    restaurantDemand,
    staffOverload: staff?.overload ?? null,
    esgScore,
    marketingReputation: marketing?.reputation ?? null,
    clientsSatisfaction,
    previousState,
  });
}

// Assembles the full RM Advanced report RmAdvancedReport.jsx shows.
export function generateRmAdvancedReport(rmAdvancedState) {
  const state = safeObject(rmAdvancedState);
  return {
    period: state.period,
    generatedAt: new Date().toISOString(),
    compression: state.compression,
    displacement: state.displacement,
    pickupCurves: state.pickupCurves,
    otaStrategy: state.otaStrategy,
    specialPricing: state.specialPricing,
    diagnostics: state.diagnostics || [],
    forecast: state.forecast,
    replay: {
      totalCycles: (state.replayLog?.entries || []).length,
      entries: state.replayLog?.entries || [],
    },
  };
}

// Folds RM Advanced diagnostics into the Analytics module's own
// diagnostics list (same shape analyticsEngine already expects).
export function rmAdvancedDiagnosticsToAnalytics(diagnostics) {
  return (diagnostics || []).map((entry) => ({
    type: entry.type,
    severity: entry.severity,
    message: entry.message,
    cycleIndex: null,
  }));
}

export { RM_ADVANCED_ACTION_CATALOG, findRmAdvancedAction, applyRmAdvancedDecision };

export const rmAdvancedEngine = {
  runRmAdvancedCycle,
  rmAdvancedFromCareerState,
  generateRmAdvancedReport,
  rmAdvancedDiagnosticsToAnalytics,
  applyRmAdvancedDecision,
  findRmAdvancedAction,
  RM_ADVANCED_ACTION_CATALOG,
};
export default rmAdvancedEngine;
