// Orchestrates the Restaurant Advanced module: given the player's own
// hotel bundle ({ hotelState, restaurantState, ... }) plus the other
// modules' own computed outputs (kitchen overload from Staff, waste
// share from ESG, guest satisfaction from Clients), computes one full
// F&B cycle (food cost → popularity → profitability → menu engineering
// → diagnostics), records it into the restaurant-advanced replay log,
// and exposes the RESTAURANT_ACTION_CATALOG a player can apply to their
// own hotel bundle -- see restaurantActions.js.
//
// "synchroniser avec careerEngine": restaurantAdvancedFromCareerState()
// builds a cycle straight from a CareerState (see lib/career/careerState.js),
// folding in every other module's own computed values without
// careerEngine.js needing to know about this module -- same integration
// pattern lib/clients/clientsEngine.js already established.
import { safeArray, safeNumber, safeObject } from "../safe";
import { computeFoodCost } from "./restaurantFoodCost";
import { computePopularity } from "./restaurantPopularity";
import { computeProfitability } from "./restaurantProfitability";
import { computeMenuEngineering } from "./restaurantMenuEngineering";
import { generateRestaurantDiagnostics } from "./restaurantDiagnostics";
import { generateRestaurantForecast } from "./restaurantForecast";
import { createRestaurantAdvancedState } from "./restaurantAdvancedState";
import { recordCycle } from "../scenario/scenarioReplay";
import { applyRestaurantAdvancedDecision, findRestaurantAction, RESTAURANT_ACTION_CATALOG } from "./restaurantActions";
import { staffFromCareerState } from "../staff/staffEngine";

function toDateOnly(referenceDate) {
  return String(referenceDate?.toISOString ? referenceDate.toISOString() : referenceDate).slice(0, 10);
}

// Reads the restaurant-advanced-specific settings from
// hotelState.restaurantAdvanced (lazily seeded by restaurantActions.js).
// Returns sensible defaults when the namespace doesn't exist yet.
function resolveRestaurantAdvancedSettings(hotelState) {
  const state = safeObject(hotelState);
  const restaurantAdvanced = safeObject(state.restaurantAdvanced);
  return {
    menuOptimizationBonus: safeNumber(restaurantAdvanced.menuOptimizationBonus, 0),
    wasteReductionBonus: safeNumber(restaurantAdvanced.wasteReductionBonus, 0),
    supplierNegotiationBonus: safeNumber(restaurantAdvanced.supplierNegotiationBonus, 0),
    pricingBonus: safeNumber(restaurantAdvanced.pricingBonus, 0),
    popularityBonus: safeNumber(restaurantAdvanced.popularityBonus, 0),
  };
}

// Runs one Restaurant Advanced cycle against the player's hotel bundle.
export function runRestaurantAdvancedCycle({
  hotelBundle,
  staffOverload = null, // 0-100, kitchen/service load (Staff integration)
  esgWastePct = null, // 0-100, food waste share (ESG integration)
  clientsSatisfaction = null, // 0-100, guest satisfaction (Clients integration)
  previousState = null,
  referenceDate = new Date(),
} = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const settings = resolveRestaurantAdvancedSettings(hotelState);
  const previous = safeObject(previousState);
  const cyclesElapsed = safeNumber(previous.cyclesElapsed, 0) + 1;
  const menu = safeArray(bundle.restaurantState?.menu, []);

  // "réduire les pertes" lowers the reported waste share, which in turn
  // is only informational on foodCost.wastePct (never rewrites cost).
  const effectiveWasteRate =
    esgWastePct !== null ? Math.max(0, safeNumber(esgWastePct, 0) - settings.wasteReductionBonus) : null;

  const foodCost = computeFoodCost({ menu, wasteRate: effectiveWasteRate, volatilityBonus: settings.supplierNegotiationBonus });

  // "optimiser la carte" and "repositionner les prix" both lift the
  // reported margins -- optimizing the menu mix contributes half as much
  // as a direct price repositioning.
  const profitability = computeProfitability({
    menu,
    pricingBonus: settings.pricingBonus + settings.menuOptimizationBonus * 0.5,
  });

  const popularity = computePopularity({
    menu,
    previousPopularity: previous.popularity?.items,
    popularityBonus: settings.popularityBonus,
    clientsSatisfaction,
  });

  const menuEngineering = computeMenuEngineering({ menu });

  const diagnostics = generateRestaurantDiagnostics({
    foodCost,
    profitability,
    menuEngineering,
    popularity,
    staffOverload,
    esgWastePct: effectiveWasteRate,
  });

  const nextState = createRestaurantAdvancedState({
    period: toDateOnly(referenceDate),
    foodCost,
    popularity,
    profitability,
    menuEngineering,
    diagnostics,
    cyclesElapsed,
    replayLog: recordCycle(previous.replayLog, {
      cycleIndex: cyclesElapsed - 1,
      period: toDateOnly(referenceDate),
      foodCost: foodCost.overall,
      grossMargin: profitability.grossMargin,
      popularityAvg: popularity.items.length
        ? Math.round(popularity.items.reduce((sum, item) => sum + safeNumber(item.popularity, 0), 0) / popularity.items.length)
        : null,
      diagnostics,
    }),
    lastUpdated: new Date().toISOString(),
  });

  const forecast = generateRestaurantForecast(nextState);
  return { ...nextState, forecast };
}

// Career integration -- builds a Restaurant Advanced cycle straight from
// a CareerState, pulling the Staff module's own output via its
// *FromCareerState() adapter, and reading ESG/Clients state directly off
// the hotel bundle -- same integration pattern as clientsFromCareerState().
export function restaurantAdvancedFromCareerState(careerState, previousState = null) {
  const state = safeObject(careerState);
  const staff = state.hotel ? staffFromCareerState(state) : null;

  // ESG waste share, straight off the hotel's own ESG state (same field
  // clientsFromCareerState() reads for its own ESG score).
  const hotelEsg = safeObject(state.hotel?.hotelState?.esg);
  const esgWastePct = hotelEsg.waste ?? null;

  // Clients satisfaction: prefer the Clients module's own persisted
  // score if the hotel bundle carries it, otherwise fall back to today's
  // restaurant customer-satisfaction rating (1-5 -> 0-100), the same
  // signal clientsFromCareerState() uses for its own restaurant input.
  const rawClientsSatisfaction = state.hotel?.hotelState?.clients?.satisfaction;
  const rawRestaurantRating = state.lastDayReport?.restaurantReport?.customerSatisfaction;
  const clientsSatisfaction =
    rawClientsSatisfaction ?? (rawRestaurantRating !== undefined && rawRestaurantRating !== null
      ? Math.round(((safeNumber(rawRestaurantRating, 0) - 1) / 4) * 100)
      : null);

  return runRestaurantAdvancedCycle({
    hotelBundle: state.hotel,
    staffOverload: staff?.overload ?? null,
    esgWastePct,
    clientsSatisfaction,
    previousState,
  });
}

// Assembles the full Restaurant Advanced report RestaurantReport.jsx shows.
export function generateRestaurantAdvancedReport(restaurantAdvancedState) {
  const state = safeObject(restaurantAdvancedState);
  return {
    period: state.period,
    generatedAt: new Date().toISOString(),
    foodCost: state.foodCost,
    popularity: state.popularity,
    profitability: state.profitability,
    menuEngineering: state.menuEngineering,
    diagnostics: state.diagnostics || [],
    forecast: state.forecast,
    replay: {
      totalCycles: (state.replayLog?.entries || []).length,
      entries: state.replayLog?.entries || [],
    },
  };
}

// Folds Restaurant Advanced diagnostics into the Analytics module's own
// diagnostics list (same shape analyticsEngine already expects).
export function restaurantAdvancedDiagnosticsToAnalytics(diagnostics) {
  return (diagnostics || []).map((entry) => ({
    type: entry.type,
    severity: entry.severity,
    message: entry.message,
    cycleIndex: null,
  }));
}

export { RESTAURANT_ACTION_CATALOG, findRestaurantAction, applyRestaurantAdvancedDecision };

export const restaurantAdvancedEngine = {
  runRestaurantAdvancedCycle,
  restaurantAdvancedFromCareerState,
  generateRestaurantAdvancedReport,
  restaurantAdvancedDiagnosticsToAnalytics,
  applyRestaurantAdvancedDecision,
  findRestaurantAction,
  RESTAURANT_ACTION_CATALOG,
};
export default restaurantAdvancedEngine;
