// Shapes a player's run into the reports the match view and the final
// review actually read: the daily cycle-by-cycle history (from the
// scenario's own replay log) plus a compact summary of current standing.
import { safeArray } from "../safe";
import { buildReplay } from "../scenario/scenarioReplay";

export function collectDailyReports(runState) {
  return buildReplay(runState?.replayLog).entries;
}

export function buildPlayerReport(player, runState) {
  const dailyReports = collectDailyReports(runState);
  const objectives = safeArray(runState?.objectivesStatus?.objectives);

  return {
    playerId: player.id,
    playerName: player.name,
    status: runState?.status || "not_started",
    cycleIndex: runState?.cycleIndex || 0,
    totalCycles: runState?.totalCycles || 0,
    currentScore: runState?.scoreHistory?.length ? runState.scoreHistory[runState.scoreHistory.length - 1] : null,
    scoreHistory: safeArray(runState?.scoreHistory),
    objectives,
    dailyReports,
  };
}

export function buildMatchReports(players, runsByPlayerId) {
  return safeArray(players).map((player) => buildPlayerReport(player, runsByPlayerId?.[player.id]));
}
