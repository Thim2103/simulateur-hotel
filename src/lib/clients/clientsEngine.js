// Orchestrates the Clients module: given the player's own hotel bundle
// ({ hotelState, restaurantState, rooms, reservations }) plus the other
// modules' own computed outputs (satisfaction inputs from HK/Staff/RM/
// Restaurant/ESG/Marketing), computes one full clients cycle
// (segments → satisfaction → reviews → loyalty → behaviors → complaints
// → diagnostics → forecast), records it into the clients replay log, and
// exposes the CLIENTS_ACTION_CATALOG a player can apply to their own
// hotel bundle -- see clientsActions.js.
//
// "synchroniser avec careerEngine": clientsFromCareerState() builds a
// clients cycle straight from a CareerState (see
// lib/career/careerState.js), folding in every other module's own
// computed values without careerEngine.js needing to know about this
// module -- same integration pattern housekeepingEngine.js,
// esgEngine.js, etc. already established.
import { safeArray, safeNumber, safeObject } from "../safe";
import { computeSegments, dominantSegment } from "./clientsSegments";
import { computeSatisfaction, restaurantRatingToScore } from "./clientsSatisfaction";
import { computeBehaviors } from "./clientsBehavior";
import { computeReviews } from "./clientsReviews";
import { computeLoyalty } from "./clientsLoyalty";
import { generateClientsDiagnostics } from "./clientsDiagnostics";
import { generateClientsForecast } from "./clientsForecast";
import { createClientsState } from "./clientsState";
import { recordCycle } from "../scenario/scenarioReplay";
import { applyClientsDecision, findClientsAction, CLIENTS_ACTION_CATALOG } from "./clientsActions";
import { staffFromCareerState } from "../staff/staffEngine";
import { marketingFromCareerState } from "../marketing/marketingEngine";
import { housekeepingFromCareerState } from "../housekeeping/housekeepingEngine";

function toDateOnly(referenceDate) {
  return String(referenceDate?.toISOString ? referenceDate.toISOString() : referenceDate).slice(0, 10);
}

// Reads the clients-specific settings from hotelState.clients
// (lazily seeded by clientsActions.js). Returns sensible defaults
// when the namespace doesn't exist yet.
function resolveClientsSettings(hotelState) {
  const state = safeObject(hotelState);
  const clients = safeObject(state.clients);
  return {
    serviceScore: safeNumber(clients.serviceScore, 50),
    complaintResolutionRate: safeNumber(clients.complaintResolutionRate, 50),
    loyaltyBonus: safeNumber(clients.loyaltyBonus, 0),
    segmentDiversificationBonus: safeNumber(clients.segmentDiversificationBonus, 0),
    reviewBonus: safeNumber(clients.reviewBonus, 0),
  };
}

// 1-8. Runs one clients cycle against the player's hotel bundle.
export function runClientsCycle({
  hotelBundle,
  housekeepingQuality = null,
  staffMorale = null,
  rmSatisfaction = null,
  restaurantSatisfaction = null, // 1-5 scale
  esgScore = null,
  marketingReputation = null,
  dailyRevenue = null,
  fbRevenue = null,
  previousState = null,
  referenceDate = new Date(),
} = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const settings = resolveClientsSettings(hotelState);
  const previous = safeObject(previousState);
  const cyclesElapsed = safeNumber(previous.cyclesElapsed, 0) + 1;

  // Adjust staff morale by the client service score set via actions
  const effectiveStaffMorale =
    staffMorale !== null ? Math.round(safeNumber(staffMorale, 50) * 0.85 + settings.serviceScore * 0.15) : null;

  // Restaurant rating: convert 1-5 → 0-100 when provided
  const effectiveRestaurant =
    restaurantSatisfaction !== null ? restaurantRatingToScore(restaurantSatisfaction) : null;

  // Complaint resolution rate boosts rm/staff satisfaction perception
  const effectiveRm =
    rmSatisfaction !== null
      ? Math.round(safeNumber(rmSatisfaction, 50) * 0.9 + settings.complaintResolutionRate * 0.1)
      : null;

  // Marketing reputation with hotelState.marketing.reputationBonus
  const marketing = safeObject(hotelState.marketing);
  const effectiveMarketing =
    marketingReputation !== null
      ? Math.min(100, safeNumber(marketingReputation, 50) + safeNumber(marketing.reputationBonus, 0))
      : null;

  // 1. Segments
  const segments = computeSegments({ hotelBundle: bundle, marketingReputation: effectiveMarketing });

  // Apply diversification bonus if action was used
  if (settings.segmentDiversificationBonus > 0) {
    const bonus = settings.segmentDiversificationBonus;
    const dominant = dominantSegment(segments);
    for (const key of Object.keys(segments)) {
      if (key !== dominant) {
        segments[key] = Math.min(50, segments[key] + Math.round(bonus / 3));
      } else {
        segments[key] = Math.max(10, segments[key] - bonus);
      }
    }
  }

  // 2. Satisfaction
  const satisfaction = computeSatisfaction({
    housekeepingQuality,
    staffMorale: effectiveStaffMorale,
    rmSatisfaction: effectiveRm,
    restaurantSatisfaction: effectiveRestaurant,
    esgScore,
    marketingReputation: effectiveMarketing,
  });

  // 3. Reviews
  const occupiedRooms = safeArray(bundle.reservations).filter((r) =>
    /occupied|checked.in/i.test(String(r.status || ""))
  ).length;
  const prevReviews = previous.reviews || null;
  const reviews = computeReviews({
    satisfaction,
    previousReviews: prevReviews,
    occupiedRooms,
  });

  // Apply review bonus from actions
  if (settings.reviewBonus > 0) {
    reviews.avgRating = Math.min(5, reviews.avgRating + settings.reviewBonus * 0.05);
    reviews.positive = Math.min(98, reviews.positive + settings.reviewBonus);
  }

  // 4. Loyalty
  const prevLoyalty = previous.loyalty ?? null;
  let loyalty = computeLoyalty({ satisfaction, previousLoyalty: prevLoyalty, segments });

  // Apply loyalty bonus from programme fidélité action
  if (settings.loyaltyBonus > 0) {
    loyalty = Math.min(100, loyalty + settings.loyaltyBonus);
  }

  // 5. Behaviors
  const behaviors = computeBehaviors({ hotelBundle: bundle, satisfaction, loyalty, segments, dailyRevenue, fbRevenue });

  // 6. Complaints (simple model: derived from negative review %)
  const complaints = [];
  if (safeNumber(reviews.negative, 0) > 20) {
    complaints.push({ type: "service", severity: "medium", resolved: settings.complaintResolutionRate > 60 });
  }
  if (safeNumber(housekeepingQuality, 100) < 50) {
    complaints.push({ type: "chambre", severity: "high", resolved: false });
  }

  // 7. Diagnostics
  const diagnostics = generateClientsDiagnostics({
    satisfaction,
    loyalty,
    reviews,
    segments,
    behaviors,
    housekeepingQuality,
    staffMorale,
    esgScore,
  });

  const nextState = createClientsState({
    period: toDateOnly(referenceDate),
    segments,
    satisfaction,
    loyalty,
    reviews,
    complaints,
    behaviors,
    diagnostics,
    cyclesElapsed,
    replayLog: recordCycle(previous.replayLog, {
      cycleIndex: cyclesElapsed - 1,
      period: toDateOnly(referenceDate),
      satisfaction,
      loyalty,
      avgRating: reviews.avgRating,
      diagnostics,
    }),
    lastUpdated: new Date().toISOString(),
  });

  // 8. Forecast
  const forecast = generateClientsForecast(nextState);
  return { ...nextState, forecast };
}

// Career integration -- builds a clients cycle straight from a
// CareerState, pulling housekeeping/staff/marketing outputs via their
// own *FromCareerState() adapters so careerEngine.js stays agnostic.
export function clientsFromCareerState(careerState, previousClientsState = null) {
  const state = safeObject(careerState);
  const staff = state.hotel ? staffFromCareerState(state) : null;
  const marketing = state.hotel ? marketingFromCareerState(state) : null;
  const hk = state.hotel ? housekeepingFromCareerState(state, previousClientsState?._hkState ?? null) : null;

  // Restaurant satisfaction: lastDayReport (1-5 scale)
  const rawRestaurant = state.lastDayReport?.restaurantReport?.customerSatisfaction;
  const restaurantSatisfaction = rawRestaurant !== undefined && rawRestaurant !== null ? safeNumber(rawRestaurant, null) : null;

  // ESG score from hotelState.esg
  const hotelEsg = safeObject(state.hotel?.hotelState?.esg);
  const esgScore = hotelEsg.overallScore ?? hotelEsg.score ?? null;

  // RM price-value: derived from ADR vs base rate (simple proxy)
  const adr = state.lastDayReport?.revenueStats?.adr ?? state.hotel?.hotelState?.rm?.targetADR ?? null;
  const baseRate = state.hotel?.hotelState?.pricePerNight ?? adr;
  const rmSatisfaction = adr !== null && baseRate !== null && safeNumber(baseRate, 0) > 0
    ? Math.round(Math.min(100, Math.max(0, 100 - ((safeNumber(adr, 0) - safeNumber(baseRate, 0)) / safeNumber(baseRate, 0)) * 50)))
    : null;

  // Daily revenue
  const dailyRevenue = state.lastDayReport?.revenue ?? null;
  const fbRevenue = state.lastDayReport?.restaurantReport?.revenue ?? null;

  return runClientsCycle({
    hotelBundle: state.hotel,
    housekeepingQuality: hk?.quality ?? null,
    staffMorale: staff?.morale ?? null,
    rmSatisfaction,
    restaurantSatisfaction,
    esgScore,
    marketingReputation: marketing?.reputation ?? null,
    dailyRevenue,
    fbRevenue,
    previousState: previousClientsState,
  });
}

// Assembles the full clients report ClientsReport.jsx shows.
export function generateClientsReport(clientsState) {
  const state = safeObject(clientsState);
  return {
    period: state.period,
    generatedAt: new Date().toISOString(),
    segments: state.segments,
    satisfaction: state.satisfaction,
    loyalty: state.loyalty,
    reviews: state.reviews,
    complaints: state.complaints,
    behaviors: state.behaviors,
    diagnostics: state.diagnostics || [],
    forecast: state.forecast,
    replay: {
      totalCycles: (state.replayLog?.entries || []).length,
      entries: state.replayLog?.entries || [],
    },
  };
}

// Folds clients diagnostics into the Analytics module's own
// diagnostics list (same shape analyticsEngine already expects).
export function clientsDiagnosticsToAnalytics(clientsDiagnostics) {
  return (clientsDiagnostics || []).map((entry) => ({
    type: entry.type,
    severity: entry.severity,
    message: entry.message,
    cycleIndex: null,
  }));
}

export { CLIENTS_ACTION_CATALOG, findClientsAction, applyClientsDecision };

export const clientsEngine = {
  runClientsCycle,
  clientsFromCareerState,
  generateClientsReport,
  clientsDiagnosticsToAnalytics,
  applyClientsDecision,
  findClientsAction,
  CLIENTS_ACTION_CATALOG,
};
export default clientsEngine;
