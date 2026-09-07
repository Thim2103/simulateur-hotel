import { eventFrequency, eventsForCycle, eventTimeline } from "./replayEvents";

function cycle(cycleIndex, events, date = "2026-09-10") {
  return { cycleIndex, baseReport: { date }, scenarioEvents: events };
}

test("eventsForCycle returns that cycle's events, defensively", () => {
  expect(eventsForCycle(cycle(0, [{ id: "vip" }]))).toEqual([{ id: "vip" }]);
  expect(eventsForCycle(null)).toEqual([]);
});

test("eventTimeline flattens every cycle's events, tagged with cycleIndex and date", () => {
  const cycles = [cycle(0, [{ id: "vip" }]), cycle(1, [{ id: "rush" }, { id: "weather" }])];
  const timeline = eventTimeline(cycles);
  expect(timeline).toEqual([
    { cycleIndex: 0, date: "2026-09-10", event: { id: "vip" } },
    { cycleIndex: 1, date: "2026-09-10", event: { id: "rush" } },
    { cycleIndex: 1, date: "2026-09-10", event: { id: "weather" } },
  ]);
});

test("eventFrequency counts how many times each event id fired across the run", () => {
  const cycles = [cycle(0, [{ id: "rush" }]), cycle(1, [{ id: "rush" }, { id: "weather" }])];
  expect(eventFrequency(cycles)).toEqual({ rush: 2, weather: 1 });
});

test("eventFrequency falls back to eventId or 'unknown' when an event has no id", () => {
  const cycles = [cycle(0, [{ eventId: "legacy" }, {}])];
  expect(eventFrequency(cycles)).toEqual({ legacy: 1, unknown: 1 });
});
