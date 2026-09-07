import { buildReplay, createReplayLog, recordCycle, replayCycle } from "./scenarioReplay";

test("recordCycle appends a timestamped entry", () => {
  const log = recordCycle(createReplayLog(), { cycleIndex: 0, score: 10 });
  expect(log.entries).toHaveLength(1);
  expect(log.entries[0]).toEqual(expect.objectContaining({ cycleIndex: 0, score: 10, recordedAt: expect.any(String) }));
});

test("buildReplay reconstructs the full sequence in order", () => {
  let log = createReplayLog();
  log = recordCycle(log, { cycleIndex: 0 });
  log = recordCycle(log, { cycleIndex: 1 });
  const replay = buildReplay(log);
  expect(replay.totalCycles).toBe(2);
  expect(replay.entries.map((entry) => entry.cycleIndex)).toEqual([0, 1]);
});

test("replayCycle returns the exact entry at that index without recomputation", () => {
  const log = recordCycle(createReplayLog(), { cycleIndex: 0, score: 42 });
  const replay = buildReplay(log);
  expect(replayCycle(replay, 0)).toEqual(expect.objectContaining({ score: 42 }));
});

test("an empty log never throws", () => {
  expect(buildReplay(createReplayLog())).toEqual({ totalCycles: 0, entries: [] });
  expect(replayCycle(buildReplay(createReplayLog()), 0)).toBeNull();
});
