// Shape helpers for the Academy module's in-memory state, plus the
// serialization boundary a ScenarioRunState needs before it can be
// persisted as jsonb (see academyRepository.js): scenarioEngine's runState
// carries a `triggeredEventIds` Set, which JSON.stringify silently drops.
import { safeArray, safeObject } from "../safe";

export function createAcademyState(overrides = {}) {
  return {
    classes: [],
    groups: [],
    assignments: [],
    runsByGroupId: {},
    reportsByGroupId: {},
    ...overrides,
  };
}

// A ScenarioRunState (see lib/scenario/scenarioEngine.js) -> a plain,
// JSON-safe object for academy_runs.run_state.
export function serializeRunState(runState) {
  if (!runState) return null;
  return { ...runState, triggeredEventIds: Array.from(runState.triggeredEventIds || []) };
}

// The inverse of serializeRunState -- reconstructs the Set scenarioEngine
// expects from the plain array Supabase returns.
export function deserializeRunState(stored) {
  if (!stored) return null;
  return { ...stored, triggeredEventIds: new Set(safeArray(stored.triggeredEventIds)) };
}

export function findClass(state, classId) {
  return safeArray(state?.classes).find((entry) => entry.id === classId) || null;
}

export function findGroup(state, groupId) {
  return safeArray(state?.groups).find((entry) => entry.id === groupId) || null;
}

export function groupsForClass(state, classId) {
  return safeArray(state?.groups).filter((entry) => entry.classId === classId);
}

export function assignmentsForClass(state, classId) {
  return safeArray(state?.assignments).filter((entry) => entry.classId === classId);
}

export function runForGroup(state, groupId) {
  return safeObject(state?.runsByGroupId)[groupId] || null;
}
