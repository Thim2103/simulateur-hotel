import {
  buildTimeline,
  clampCycleIndex,
  decisionsForCycle,
  getCycle,
  nextCycleIndex,
  previousCycleIndex,
  stateSnapshotForCycle,
} from "./replayTimeline";

function cycle(overrides = {}) {
  return {
    cycleIndex: 0,
    baseReport: { date: "2026-09-10", nextState: { hotelState: { finance: {} } } },
    scenarioEvents: [],
    score: 60,
    decisions: { pricingADR: 150 },
    ...overrides,
  };
}

test("buildTimeline summarizes each cycle without the full state snapshot", () => {
  const cycles = [cycle({ cycleIndex: 0, score: 60 }), cycle({ cycleIndex: 1, score: 70, scenarioEvents: [{ id: "vip" }] })];
  const timeline = buildTimeline(cycles);
  expect(timeline).toEqual([
    { cycleIndex: 0, date: "2026-09-10", score: 60, eventCount: 0, blocked: false },
    { cycleIndex: 1, date: "2026-09-10", score: 70, eventCount: 1, blocked: false },
  ]);
});

test("getCycle finds a cycle by its cycleIndex", () => {
  const cycles = [cycle({ cycleIndex: 0 }), cycle({ cycleIndex: 1 })];
  expect(getCycle(cycles, 1)).toEqual(cycles[1]);
  expect(getCycle(cycles, 5)).toBeNull();
});

test("stateSnapshotForCycle reads the nextState already carried by the cycle's baseReport", () => {
  const target = cycle();
  expect(stateSnapshotForCycle(target)).toEqual(target.baseReport.nextState);
  expect(stateSnapshotForCycle(null)).toBeNull();
});

test("decisionsForCycle is defensive against a missing cycle", () => {
  expect(decisionsForCycle(cycle())).toEqual({ pricingADR: 150 });
  expect(decisionsForCycle(null)).toEqual({});
});

test("clampCycleIndex keeps the index within [0, totalCycles - 1]", () => {
  expect(clampCycleIndex(-3, 5)).toBe(0);
  expect(clampCycleIndex(99, 5)).toBe(4);
  expect(clampCycleIndex(2, 5)).toBe(2);
});

test("nextCycleIndex/previousCycleIndex never leave the valid range", () => {
  expect(nextCycleIndex(4, 5)).toBe(4);
  expect(previousCycleIndex(0, 5)).toBe(0);
  expect(nextCycleIndex(1, 5)).toBe(2);
});
