// Automatic leaderboard: ranks every registered player of a match by
// their current (mid-match) or final score. Ties keep their relative
// input order (Array#sort stability); rank is simply position + 1.
import { safeArray } from "../safe";
import { currentScoreForPlayer } from "./competitionScoring";

export function rankPlayers(players, runsByPlayerId) {
  const entries = safeArray(players).map((player) => {
    const run = runsByPlayerId?.[player.id];
    return {
      playerId: player.id,
      playerName: player.name,
      status: run?.status || "not_started",
      currentScore: run ? currentScoreForPlayer(run) : null,
    };
  });

  return entries
    .sort((a, b) => (b.currentScore ?? -Infinity) - (a.currentScore ?? -Infinity))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

// A per-objective breakdown across every player -- which objective is
// giving the whole field the most trouble.
export function objectiveBreakdown(players, runsByPlayerId) {
  const reports = safeArray(players).map((player) => {
    const run = runsByPlayerId?.[player.id];
    return { playerId: player.id, playerName: player.name, objectives: safeArray(run?.objectivesStatus?.objectives) };
  });
  const objectiveIds = [...new Set(reports.flatMap((entry) => entry.objectives.map((objective) => objective.id)))];

  return objectiveIds.map((objectiveId) => {
    const perPlayer = reports.map((entry) => {
      const objective = entry.objectives.find((candidate) => candidate.id === objectiveId);
      return { playerId: entry.playerId, playerName: entry.playerName, achieved: Boolean(objective?.achieved) };
    });
    return { objectiveId, achievedCount: perPlayer.filter((entry) => entry.achieved).length, totalPlayers: perPlayer.length, perPlayer };
  });
}
