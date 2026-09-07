import { analyzeEventFrequency, analyzeEventImpact, analyzeEvents } from "./analyticsEvents";

function cycle(cycleIndex, events, score) {
  return { cycleIndex, score, baseReport: { date: "2026-09-10" }, scenarioEvents: events };
}

test("analyzeEventFrequency counts occurrences per event id", () => {
  const cycles = [cycle(0, [{ id: "rush" }], 40), cycle(1, [{ id: "rush" }, { id: "weather" }], 30)];
  expect(analyzeEventFrequency(cycles)).toEqual({ rush: 2, weather: 1 });
});

test("analyzeEventImpact computes the average score delta on the cycle an event fired", () => {
  const cycles = [cycle(0, [], 50), cycle(1, [{ id: "rush" }], 40), cycle(2, [{ id: "rush" }], 45)];
  const impact = analyzeEventImpact(cycles);
  const rush = impact.find((entry) => entry.eventId === "rush");
  // cycle1: delta = 40-50=-10; cycle2: delta=45-40=5 -> avg -2.5
  expect(rush).toEqual({ eventId: "rush", occurrences: 2, averageScoreDelta: -2.5 });
});

test("analyzeEventImpact returns null averageScoreDelta for an event on the very first cycle (no prior score)", () => {
  const cycles = [cycle(0, [{ id: "vip" }], 50)];
  const impact = analyzeEventImpact(cycles);
  expect(impact).toEqual([{ eventId: "vip", occurrences: 1, averageScoreDelta: null }]);
});

test("analyzeEvents bundles frequency and impact together", () => {
  const cycles = [cycle(0, [{ id: "rush" }], 40)];
  const result = analyzeEvents(cycles);
  expect(result.frequency).toEqual({ rush: 1 });
  expect(result.impact).toEqual([expect.objectContaining({ eventId: "rush" })]);
});
