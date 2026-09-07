import { useCallback, useState } from "react";
import {
  addMatch as addMatchToState,
  createCompetitionState,
  createMatch as createMatchEntry,
  createPlayer as createPlayerEntry,
  findMatch,
  registerPlayer as registerPlayerInState,
  setMatchScenario,
} from "../lib/competition";
import { assignScenarioToMatch, finalizeMatch, runPlayerCycle as runPlayerCycleEngine } from "../lib/competition/competitionEngine";
import competitionRepository from "../lib/competition/competitionRepository";

// Drives the whole Competition module: an organizer's matches, each
// match's registered players, the global scenario assigned to it (with
// its shared seed), and every player's own sandboxed run (see
// lib/competition/competitionEngine.js -- which wraps lib/scenario/
// scenarioEngine.js, itself running runDailyCycle() with persist: false).
// State is kept locally and mirrored to Supabase via
// competitionRepository.js; a load/save failure surfaces as `error`
// rather than silently reverting to demo data.
export function useCompetition() {
  const [competitionState, setCompetitionState] = useState(createCompetitionState());
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useCompetition]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const createCompetition = useCallback(
    (name) =>
      runWithErrorHandling(async () => {
        const match = await competitionRepository.createMatch({ name });
        setCompetitionState((previous) => addMatchToState(previous, createMatchEntry(match)));
        return match;
      }),
    [runWithErrorHandling]
  );

  const registerPlayer = useCallback(
    (matchId, name) =>
      runWithErrorHandling(async () => {
        const player = await competitionRepository.registerPlayer({ matchId, name });
        setCompetitionState((previous) => registerPlayerInState(previous, createPlayerEntry(player)));
        return player;
      }),
    [runWithErrorHandling]
  );

  // Assigns the match's global scenario (stamping a shared seed onto it
  // if it doesn't have one yet) and seeds one sandboxed run per already
  // registered player, then persists all of it.
  const assignScenario = useCallback(
    (matchId, scenario) =>
      runWithErrorHandling(async () => {
        const { scenario: sharedScenario, state: nextState } = assignScenarioToMatch(competitionState, matchId, scenario);
        const withScenario = setMatchScenario(nextState, matchId, sharedScenario);
        setCompetitionState(withScenario);

        await competitionRepository.saveMatchScenario({ matchId, scenario: sharedScenario });
        const playerIds = withScenario.players.filter((player) => player.matchId === matchId).map((player) => player.id);
        await Promise.all(
          playerIds.map((playerId) =>
            competitionRepository.savePlayerRun({ matchId, playerId, scenarioId: sharedScenario.id, runState: withScenario.runsByPlayerId[playerId] })
          )
        );
        return sharedScenario;
      }),
    [competitionState, runWithErrorHandling]
  );

  // Refreshes one match's players/runs/reports from Supabase.
  // Called with no matchId, refreshes the organizer's whole match list.
  const loadCompetitionState = useCallback(
    (matchId) =>
      runWithErrorHandling(async () => {
        if (!matchId) {
          const matches = await competitionRepository.listMatches();
          setCompetitionState((previous) => ({ ...previous, matches }));
          return { matches };
        }
        const bundle = await competitionRepository.loadMatchBundle(matchId);
        setCompetitionState((previous) => ({
          ...previous,
          players: [...previous.players.filter((player) => player.matchId !== matchId), ...bundle.players],
          runsByPlayerId: { ...previous.runsByPlayerId, ...bundle.runsByPlayerId },
          reportsByPlayerId: { ...previous.reportsByPlayerId, ...bundle.reportsByPlayerId },
        }));
        return bundle;
      }),
    [runWithErrorHandling]
  );

  // Refreshes a single player's run (e.g. after another session advanced it).
  const loadPlayerState = useCallback(
    (playerId) =>
      runWithErrorHandling(async () => {
        const runState = await competitionRepository.loadPlayerRun(playerId);
        setCompetitionState((previous) => ({ ...previous, runsByPlayerId: { ...previous.runsByPlayerId, [playerId]: runState } }));
        return runState;
      }),
    [runWithErrorHandling]
  );

  // Plays one seeded, sandboxed cycle for a player and persists the run.
  const runCompetitionCycle = useCallback(
    (matchId, playerId, decisions = {}) =>
      runWithErrorHandling(async () => {
        const { report, state: nextState } = await runPlayerCycleEngine({ state: competitionState, matchId, playerId, decisions });
        setCompetitionState(nextState);
        const scenarioId = nextState.runsByPlayerId[playerId]?.scenario?.id;
        await competitionRepository.savePlayerRun({ matchId, playerId, scenarioId, runState: nextState.runsByPlayerId[playerId] });
        return report;
      }),
    [competitionState, runWithErrorHandling]
  );

  // Finalizes every player still missing a report and builds the match's
  // automatic leaderboard, persisting both.
  const generateFinalRanking = useCallback(
    (matchId) =>
      runWithErrorHandling(async () => {
        const match = findMatch(competitionState, matchId);
        const { ranking, state: nextState } = finalizeMatch(competitionState, matchId);

        if (nextState !== competitionState) setCompetitionState(nextState);

        const players = nextState.players.filter((player) => player.matchId === matchId);
        await Promise.all(
          players.map((player) => {
            const report = nextState.reportsByPlayerId[player.id];
            if (!report) return null;
            return competitionRepository.savePlayerReport({ matchId, playerId: player.id, scenarioId: match?.scenario?.id, report });
          })
        );
        await competitionRepository.saveRanking({ matchId, ranking });

        return ranking;
      }),
    [competitionState, runWithErrorHandling]
  );

  return {
    competitionState,
    isRunning,
    error,
    createCompetition,
    registerPlayer,
    assignScenario,
    loadCompetitionState,
    loadPlayerState,
    runCompetitionCycle,
    generateFinalRanking,
  };
}
