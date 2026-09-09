// Barrel export for the Clients module -- mirrors
// lib/housekeeping/index.js / lib/marketing/index.js.
export { runClientsCycle, clientsFromCareerState, generateClientsReport, clientsDiagnosticsToAnalytics, CLIENTS_ACTION_CATALOG, findClientsAction, applyClientsDecision, clientsEngine } from "./clientsEngine";
export { createClientsState } from "./clientsState";
export { computeSegments, dominantSegment } from "./clientsSegments";
export { computeSatisfaction, satisfactionToStars, restaurantRatingToScore, SATISFACTION_WEIGHTS } from "./clientsSatisfaction";
export { computeBehaviors } from "./clientsBehavior";
export { computeReviews } from "./clientsReviews";
export { computeLoyalty, loyaltyGrade } from "./clientsLoyalty";
export { generateClientsDiagnostics } from "./clientsDiagnostics";
export { generateClientsForecast } from "./clientsForecast";
