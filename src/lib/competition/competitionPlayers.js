// Pure, immutable helpers for registering players (or teams) into a match.
import { safeArray, safeString } from "../safe";

export function createPlayer({ id, matchId, name }) {
  return { id, matchId, name: safeString(name, "Nouveau joueur"), registeredAt: new Date().toISOString() };
}

export function registerPlayer(state, player) {
  return { ...state, players: [...safeArray(state.players), player] };
}

export function removePlayer(state, playerId) {
  const { [playerId]: _removedRun, ...remainingRuns } = state.runsByPlayerId || {};
  const { [playerId]: _removedReport, ...remainingReports } = state.reportsByPlayerId || {};
  return {
    ...state,
    players: safeArray(state.players).filter((entry) => entry.id !== playerId),
    runsByPlayerId: remainingRuns,
    reportsByPlayerId: remainingReports,
  };
}

export function listPlayersForMatch(state, matchId) {
  return safeArray(state?.players).filter((entry) => entry.matchId === matchId);
}
