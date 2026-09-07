// Orchestrates the Replay module: turns any of the three real run sources
// (an Academy group, a Competition player, or a standalone Scenario/TFE
// run -- every one of them just a ScenarioRunState, see
// lib/scenario/scenarioEngine.js) into one normalized ReplayRun, and
// exposes cycle-by-cycle navigation and state reconstruction on top of it.
// Stays pure/storage-agnostic like every other *Engine.js in this
// project; see replayRepository.js for the Supabase side.
import { createReplayRun, findReplayRun } from "./replayState";
import { clampCycleIndex, getCycle, nextCycleIndex, previousCycleIndex, stateSnapshotForCycle } from "./replayTimeline";

// Adapters: one per real run source, each producing the same ReplayRun
// shape so the rest of the module (and the UI) never needs to know where
// a run actually came from.
export function buildReplayRunFromAcademyGroup(group, runState, finalReport = null) {
  return createReplayRun({
    id: `academie-${group.classId}-${group.id}`,
    source: "academie",
    ownerRefs: { classId: group.classId, groupId: group.id },
    ownerLabel: group.name,
    runState,
    finalReport,
  });
}

export function buildReplayRunFromCompetitionPlayer(player, runState, finalReport = null) {
  return createReplayRun({
    id: `competition-${player.matchId}-${player.id}`,
    source: "competition",
    ownerRefs: { matchId: player.matchId, playerId: player.id },
    ownerLabel: player.name,
    runState,
    finalReport,
  });
}

// A standalone scenario run -- covers both a plain solo/scenario run and
// a TFE import (distinguished by the scenario's own `mode`, since a TFE
// run is just a "professionnel"-mode scenario run under the hood).
export function buildReplayRunFromScenarioRun({ runId, ownerLabel, runState, finalReport = null }) {
  const source = runState?.scenario?.mode === "professionnel" ? "tfe" : "scenario";
  return createReplayRun({ id: runId, source, ownerRefs: {}, ownerLabel: ownerLabel || runId, runState, finalReport });
}

// A Solo/Career run: unlike the other three sources, Career drives
// runDailyCycle() directly rather than going through scenarioEngine, so
// there is no ScenarioRunState to normalize -- lib/career/careerEngine.js
// builds its own replay log with lib/scenario/scenarioReplay.js's generic
// createReplayLog()/recordCycle() (those aren't scenario-specific in
// implementation) and passes it in here as `replayLog`.
export function buildReplayRunFromCareerRun({ playerId, replayLog, scoreHistory = [], status = "running", day = 0, ownerLabel }) {
  return createReplayRun({
    id: `career-${playerId}`,
    source: "career",
    ownerRefs: { playerId },
    ownerLabel: ownerLabel || `Carrière de ${playerId}`,
    runState: { replayLog, scoreHistory, status, totalCycles: day, scenario: null },
  });
}

// Loads a run into the replay state (already-built ReplayRun in -- the
// hook is responsible for fetching the raw run/report from whichever
// repository owns it and building it with the adapters above).
export function loadReplayRun(state, run) {
  return { ...state, runsById: { ...state.runsById, [run.id]: run }, currentRunId: run.id, currentCycleIndex: 0 };
}

export function getCycleForRun(run, cycleIndex) {
  return getCycle(run?.cycles, cycleIndex);
}

export function reconstructStateAtCycle(run, cycleIndex) {
  return stateSnapshotForCycle(getCycleForRun(run, cycleIndex));
}

export function goToNextCycle(state) {
  const run = findReplayRun(state, state.currentRunId);
  return { ...state, currentCycleIndex: nextCycleIndex(state.currentCycleIndex, run?.totalCycles) };
}

export function goToPreviousCycle(state) {
  const run = findReplayRun(state, state.currentRunId);
  return { ...state, currentCycleIndex: previousCycleIndex(state.currentCycleIndex, run?.totalCycles) };
}

export function jumpToCycleIndex(state, cycleIndex) {
  const run = findReplayRun(state, state.currentRunId);
  return { ...state, currentCycleIndex: clampCycleIndex(cycleIndex, run?.totalCycles) };
}

export const replayEngine = {
  buildReplayRunFromAcademyGroup,
  buildReplayRunFromCompetitionPlayer,
  buildReplayRunFromScenarioRun,
  buildReplayRunFromCareerRun,
  loadReplayRun,
  getCycleForRun,
  reconstructStateAtCycle,
  goToNextCycle,
  goToPreviousCycle,
  jumpToCycleIndex,
};
export default replayEngine;
