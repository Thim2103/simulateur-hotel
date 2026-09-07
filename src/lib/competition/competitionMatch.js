// Pure, immutable helpers for managing an organizer's matches (a match =
// one global scenario, played simultaneously by every registered player).
import { safeArray, safeString } from "../safe";
import { playersForMatch } from "./competitionState";

export function createMatch({ id, name, organizerId }) {
  return { id, name: safeString(name, "Nouvelle compétition"), organizerId, scenario: null, createdAt: new Date().toISOString() };
}

export function addMatch(state, match) {
  return { ...state, matches: [...safeArray(state.matches), match] };
}

export function removeMatch(state, matchId) {
  return {
    ...state,
    matches: safeArray(state.matches).filter((entry) => entry.id !== matchId),
    players: safeArray(state.players).filter((entry) => entry.matchId !== matchId),
  };
}

export function listMatches(state) {
  return safeArray(state?.matches);
}

// Records the global scenario (with its shared seed, see
// competitionEvents.js) on the match itself, so every player's run can be
// traced back to a single source of truth.
export function setMatchScenario(state, matchId, scenario) {
  return { ...state, matches: safeArray(state.matches).map((match) => (match.id === matchId ? { ...match, scenario } : match)) };
}

export function matchSummary(state, matchId) {
  const match = safeArray(state.matches).find((entry) => entry.id === matchId);
  if (!match) return null;
  const players = playersForMatch(state, matchId);
  return { ...match, playerCount: players.length };
}
