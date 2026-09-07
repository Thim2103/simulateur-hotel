// Shape helpers for a normalized ReplayRun -- the one format the Replay
// Engine deals in regardless of where a run actually came from (a solo
// scenario, an Academy group, a Competition player, or a TFE import).
// Every source's own ScenarioRunState (see lib/scenario/scenarioEngine.js)
// already carries a `replayLog` -- this file just wraps that plus a
// little identifying metadata into one consistent object.
import { safeArray, safeObject, safeString } from "../safe";
import { buildReplay } from "../scenario/scenarioReplay";

export const REPLAY_SOURCES = ["scenario", "academie", "competition", "tfe", "career"];

// runState: a ScenarioRunState (has .scenario, .replayLog, .scoreHistory,
// .status, .cycleIndex, .totalCycles). ownerRefs: whatever ids identify
// where this run came from (classId/groupId, matchId/playerId, or just a
// scenario run id) -- kept opaque here, used only for display and for
// replayRepository.js's foreign keys.
export function createReplayRun({ id, source, ownerRefs = {}, ownerLabel = "", runState, finalReport = null }) {
  const safeSource = REPLAY_SOURCES.includes(source) ? source : "scenario";
  const replay = buildReplay(runState?.replayLog);

  return {
    id,
    source: safeSource,
    ownerRefs: safeObject(ownerRefs),
    ownerLabel: safeString(ownerLabel, id),
    scenarioId: runState?.scenario?.id || null,
    scenarioTitle: runState?.scenario?.title || "",
    status: runState?.status || "not_started",
    totalCycles: runState?.totalCycles || replay.totalCycles,
    cycles: replay.entries,
    scoreHistory: safeArray(runState?.scoreHistory),
    finalReport,
  };
}

export function createReplayState(overrides = {}) {
  return { runsById: {}, currentRunId: null, currentCycleIndex: 0, ...overrides };
}

export function addReplayRun(state, run) {
  return { ...state, runsById: { ...state.runsById, [run.id]: run }, currentRunId: run.id, currentCycleIndex: 0 };
}

export function findReplayRun(state, runId) {
  return safeObject(state?.runsById)[runId] || null;
}
