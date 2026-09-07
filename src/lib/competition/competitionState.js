// Shape helpers for the Competition module's in-memory state, plus the
// same ScenarioRunState <-> jsonb serialization boundary Academy uses
// (see lib/academy/academyState.js): scenarioEngine's runState carries a
// `triggeredEventIds` Set, which JSON.stringify silently drops.
import { safeArray, safeObject } from "../safe";

export function createCompetitionState(overrides = {}) {
  return {
    matches: [],
    players: [],
    runsByPlayerId: {},
    reportsByPlayerId: {},
    ...overrides,
  };
}

export function serializeRunState(runState) {
  if (!runState) return null;
  return { ...runState, triggeredEventIds: Array.from(runState.triggeredEventIds || []) };
}

export function deserializeRunState(stored) {
  if (!stored) return null;
  return { ...stored, triggeredEventIds: new Set(safeArray(stored.triggeredEventIds)) };
}

export function findMatch(state, matchId) {
  return safeArray(state?.matches).find((entry) => entry.id === matchId) || null;
}

export function findPlayer(state, playerId) {
  return safeArray(state?.players).find((entry) => entry.id === playerId) || null;
}

export function playersForMatch(state, matchId) {
  return safeArray(state?.players).filter((entry) => entry.matchId === matchId);
}

export function runForPlayer(state, playerId) {
  return safeObject(state?.runsByPlayerId)[playerId] || null;
}
