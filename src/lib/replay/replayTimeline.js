// Cycle-by-cycle navigation over a ReplayRun's cycles -- the scrubber
// AtoZ, and the state/decisions reconstruction for whichever cycle is
// currently selected.
import { safeArray, safeNumber } from "../safe";

// A compact summary per cycle, for the timeline scrubber: no need to ship
// the full state snapshot just to draw a row of dots.
export function buildTimeline(cycles) {
  return safeArray(cycles).map((cycle) => ({
    cycleIndex: cycle.cycleIndex,
    date: cycle.baseReport?.date || null,
    score: cycle.score ?? null,
    eventCount: safeArray(cycle.scenarioEvents).length,
    blocked: Boolean(cycle.blocked),
  }));
}

export function getCycle(cycles, cycleIndex) {
  return safeArray(cycles).find((cycle) => cycle.cycleIndex === cycleIndex) || null;
}

// The full hotel/restaurant/PMS state resulting from this cycle -- already
// produced by runDailyCycle() and carried inside the cycle's own
// baseReport (see lib/dailyCycle/runDailyCycle.js's `nextState`), so
// "reconstructing" it is just reading it back out, cycle by cycle.
export function stateSnapshotForCycle(cycle) {
  return cycle?.baseReport?.nextState || null;
}

export function decisionsForCycle(cycle) {
  return cycle?.decisions || {};
}

export function clampCycleIndex(index, totalCycles) {
  return Math.max(0, Math.min(safeNumber(totalCycles, 0) - 1, safeNumber(index, 0)));
}

export function nextCycleIndex(currentIndex, totalCycles) {
  return clampCycleIndex(currentIndex + 1, totalCycles);
}

export function previousCycleIndex(currentIndex, totalCycles) {
  return clampCycleIndex(currentIndex - 1, totalCycles);
}
