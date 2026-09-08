// Barrel for the Housekeeping module (see this directory's other
// files). Not reachable via a bare `from "../lib/housekeeping"` import
// -- src/lib/housekeeping.js (the pre-existing turnover/task-derivation
// utility PMS.jsx already uses) sits at that exact path and wins
// Node/webpack's file-before-directory resolution, so every consumer of
// this barrel must import it explicitly as `from "../lib/housekeeping/index"`
// (or, as every other module in this app already does, import each
// submodule file directly instead of going through the barrel at all).
export { createHousekeepingState } from "./housekeepingState";
export {
  computeWorkload,
  computeCleaningTime,
  computeHousekeepingProductivity,
  computeHousekeeperCount,
  detectOverload,
  detectUnderstaffing,
  costOfHousekeeping,
  resolveHousekeepingSettings,
} from "./housekeepingCalculations";
export { computeQualityScore, qualityTier, qualityTrend } from "./housekeepingQuality";
export { generateHousekeepingDiagnostics } from "./housekeepingDiagnostics";
export { generateHousekeepingForecast } from "./housekeepingForecast";
export { HOUSEKEEPING_ACTION_CATALOG, findHousekeepingAction, applyHousekeepingDecision } from "./housekeepingActions";
export {
  runHousekeepingCycle,
  housekeepingFromCareerState,
  generateHousekeepingReport,
  housekeepingDiagnosticsToAnalytics,
  housekeepingEngine,
} from "./housekeepingEngine";
