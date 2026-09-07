// Shape helpers for the Analytics module's in-memory state. Analytics
// never has its own notion of a "run" -- it always analyzes a ReplayRun
// (see lib/replay/replayState.js), so there is no separate serialization
// boundary to worry about here (no Sets, nothing non-JSON-safe).
import { safeObject } from "../safe";

export function createAnalyticsState(overrides = {}) {
  return { analysesById: {}, comparisonsById: {}, currentRunId: null, ...overrides };
}

export function addAnalysis(state, analysis) {
  return { ...state, analysesById: { ...state.analysesById, [analysis.runId]: analysis }, currentRunId: analysis.runId };
}

export function findAnalysis(state, runId) {
  return safeObject(state?.analysesById)[runId] || null;
}

export function addComparison(state, comparisonId, comparison) {
  return { ...state, comparisonsById: { ...state.comparisonsById, [comparisonId]: comparison } };
}

export function comparisonKey(runIdA, runIdB) {
  return `${runIdA}::${runIdB}`;
}
