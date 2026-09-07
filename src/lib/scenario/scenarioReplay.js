// A simple append-only log of every cycle played during a scenario run,
// plus the lookups needed to scrub through it afterwards (see
// pages/ScenarioReview.jsx and, for Academy, pages/AcademyReview.jsx).
import { safeArray } from "../safe";

export function createReplayLog() {
  return { entries: [] };
}

// entry: a ScenarioCycleReport-shaped object (see scenarioEngine.js) plus
// whatever decisions produced it.
export function recordCycle(replayLog, entry) {
  const entries = safeArray(replayLog?.entries);
  return { entries: [...entries, { ...entry, recordedAt: new Date().toISOString() }] };
}

export function buildReplay(replayLog) {
  const entries = safeArray(replayLog?.entries);
  return { totalCycles: entries.length, entries };
}

export function replayCycle(replay, index) {
  const entries = safeArray(replay?.entries);
  return entries[index] ?? null;
}
