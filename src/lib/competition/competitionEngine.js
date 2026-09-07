// Orchestrates a match: every registered player gets their own sandboxed
// ScenarioRunState (see lib/scenario/scenarioEngine.js -- itself running
// runDailyCycle() with persist: false), but all of them play against the
// exact same scenario object and the exact same seeded event rolls per
// cycle (see competitionEvents.js's createSeededRng()), which is what
// makes the resulting leaderboard fair.
import { initScenarioRun, playScenarioCycle, runScenarioBatch, finalizeScenarioRun } from "../scenario/scenarioEngine";
import { findMatch, playersForMatch, runForPlayer } from "./competitionState";
import { ensureSharedSeed, createSeededRng } from "./competitionEvents";
import { validateCommonScoring } from "./competitionScoring";
import { rankPlayers } from "./competitionRanking";

// Assigns the match's global scenario: stamps a shared seed onto it if it
// doesn't have one yet, validates the common-scoring rule, then seeds one
// independent run per player already registered in the match.
export function assignScenarioToMatch(state, matchId, scenario) {
  const sharedScenario = ensureSharedSeed(scenario, matchId);
  const { valid, errors } = validateCommonScoring(sharedScenario);
  if (!valid) throw new Error(`Scénario de compétition invalide : ${errors.join(" ")}`);

  const players = playersForMatch(state, matchId);
  const runsByPlayerId = { ...state.runsByPlayerId };
  players.forEach((player) => {
    runsByPlayerId[player.id] = initScenarioRun({ scenario: sharedScenario, playerId: player.id });
  });

  return {
    scenario: sharedScenario,
    state: { ...state, runsByPlayerId },
  };
}

// A player who joins after the scenario was already assigned needs their
// own explicit run.
export function initScenarioRunForPlayer(state, playerId, scenario) {
  return { ...state, runsByPlayerId: { ...state.runsByPlayerId, [playerId]: initScenarioRun({ scenario, playerId }) } };
}

// Plays exactly one cycle for one player, using the seed derived from the
// match's shared seed + that player's current cycle index -- never
// Math.random, and never a shared mutable rng object that would make the
// result depend on which player calls this first.
export async function runPlayerCycle({ state, matchId, playerId, decisions = {}, referenceDate = new Date() }) {
  const match = findMatch(state, matchId);
  if (!match?.scenario) throw new Error(`Aucun scénario assigné à la compétition ${matchId}.`);
  const run = runForPlayer(state, playerId);
  if (!run) throw new Error(`Aucun run en cours pour le joueur ${playerId}.`);

  const rng = createSeededRng(match.scenario.replay?.seed, run.cycleIndex);
  const { report, runState } = await playScenarioCycle({ runState: run, decisions, referenceDate, rng });

  return { report, state: { ...state, runsByPlayerId: { ...state.runsByPlayerId, [playerId]: runState } } };
}

// Accelerated play for a player -- e.g. an AI/reference opponent, or a
// TFE-style batch run -- using the same per-cycle synchronized seed.
export async function runPlayerBatch({ state, matchId, playerId, cycles, decisionsProvider, referenceDate = new Date() }) {
  const match = findMatch(state, matchId);
  if (!match?.scenario) throw new Error(`Aucun scénario assigné à la compétition ${matchId}.`);
  let run = runForPlayer(state, playerId);
  if (!run) throw new Error(`Aucun run en cours pour le joueur ${playerId}.`);

  const seed = match.scenario.replay?.seed;
  const { runState, reports } = await runScenarioBatch({
    runState: run,
    cycles,
    decisionsProvider,
    referenceDate,
    rng: createSeededRng(seed, run.cycleIndex),
  });

  return { reports, state: { ...state, runsByPlayerId: { ...state.runsByPlayerId, [playerId]: runState } } };
}

export function finalizePlayer(state, playerId) {
  const run = runForPlayer(state, playerId);
  if (!run) throw new Error(`Aucun run en cours pour le joueur ${playerId}.`);
  const report = finalizeScenarioRun(run);
  return { report, state: { ...state, reportsByPlayerId: { ...state.reportsByPlayerId, [playerId]: report } } };
}

// Finalizes every player still missing a report and returns the match's
// automatic leaderboard on top of it.
export function finalizeMatch(state, matchId) {
  const players = playersForMatch(state, matchId);
  let nextState = state;
  players.forEach((player) => {
    if (!nextState.runsByPlayerId[player.id] || nextState.reportsByPlayerId[player.id]) return;
    ({ state: nextState } = finalizePlayer(nextState, player.id));
  });

  const ranking = rankPlayers(players, nextState.runsByPlayerId);
  return { ranking, state: nextState };
}

export const competitionEngine = { assignScenarioToMatch, initScenarioRunForPlayer, runPlayerCycle, runPlayerBatch, finalizePlayer, finalizeMatch };
export default competitionEngine;
