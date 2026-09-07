// Event-focused views over a ReplayRun's cycles: what happened on one
// cycle, and the full timeline of every event across the whole run.
import { safeArray } from "../safe";

export function eventsForCycle(cycle) {
  return safeArray(cycle?.scenarioEvents);
}

// Flattens every cycle's events into one chronological list, each entry
// tagged with the cycle it happened on -- for an "all events" view or a
// quick "what went wrong" scan across the whole run.
export function eventTimeline(cycles) {
  return safeArray(cycles).flatMap((cycle) =>
    safeArray(cycle.scenarioEvents).map((event) => ({ cycleIndex: cycle.cycleIndex, date: cycle.baseReport?.date || null, event }))
  );
}

// How many times each event id fired across the run -- useful for a
// debrief ("the health inspection hit you three times").
export function eventFrequency(cycles) {
  const counts = {};
  eventTimeline(cycles).forEach(({ event }) => {
    const id = event.id || event.eventId || "unknown";
    counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
}
