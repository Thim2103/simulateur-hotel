// Event-impact analysis on top of a run's replay: which events actually
// hurt the score, and how often each category showed up.
import { safeArray, safeNumber } from "../safe";
import { eventFrequency, eventTimeline } from "../replay/replayEvents";

export function analyzeEventFrequency(cycles) {
  return eventFrequency(cycles);
}

// For every event that fired, the score delta on the cycle it fired --
// lets a debrief say "the health inspection cost you an average of 8
// points" rather than just "it happened 3 times".
export function analyzeEventImpact(cycles) {
  const list = safeArray(cycles);
  const byId = {};

  eventTimeline(list).forEach(({ cycleIndex, event }) => {
    const cycle = list.find((entry) => entry.cycleIndex === cycleIndex);
    const previous = list.find((entry) => entry.cycleIndex === cycleIndex - 1);
    const delta = previous ? safeNumber(cycle?.score, 0) - safeNumber(previous.score, 0) : null;
    const id = event.id || event.eventId || "unknown";
    if (!byId[id]) byId[id] = { eventId: id, occurrences: 0, scoreDeltas: [] };
    byId[id].occurrences += 1;
    if (delta !== null) byId[id].scoreDeltas.push(delta);
  });

  return Object.values(byId).map((entry) => ({
    eventId: entry.eventId,
    occurrences: entry.occurrences,
    averageScoreDelta: entry.scoreDeltas.length ? Math.round((entry.scoreDeltas.reduce((sum, delta) => sum + delta, 0) / entry.scoreDeltas.length) * 100) / 100 : null,
  }));
}

export function analyzeEvents(cycles) {
  return { frequency: analyzeEventFrequency(cycles), impact: analyzeEventImpact(cycles) };
}
