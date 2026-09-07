import { renderHook, act } from "@testing-library/react";
import { useReplay } from "./useReplay";
import replayRepository from "../lib/replay/replayRepository";

jest.mock("../lib/replay/replayRepository", () => ({
  loadReplayRun: jest.fn(),
  listReplayRuns: jest.fn(),
}));

function run(overrides = {}) {
  return {
    id: "academie-c1-g1",
    source: "academie",
    ownerLabel: "Groupe A",
    scenarioTitle: "Budget serré",
    status: "finished",
    totalCycles: 2,
    scoreHistory: [40, 70],
    finalReport: { finalScore: 70, grade: "B" },
    cycles: [
      { cycleIndex: 0, score: 40, baseReport: { date: "2026-09-10", profit: 500, nextState: {} }, scenarioEvents: [] },
      { cycleIndex: 1, score: 70, baseReport: { date: "2026-09-11", profit: 900, nextState: {} }, scenarioEvents: [] },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("loadReplay fetches the run and resets the cursor to cycle 0", async () => {
  replayRepository.loadReplayRun.mockResolvedValue(run());
  const { result } = renderHook(() => useReplay());

  await act(async () => {
    await result.current.loadReplay("academie-c1-g1");
  });

  expect(result.current.replayState.currentRunId).toBe("academie-c1-g1");
  expect(result.current.replayState.currentCycleIndex).toBe(0);
  expect(result.current.error).toBeNull();
});

test("loadReplay surfaces an error for an unknown run", async () => {
  replayRepository.loadReplayRun.mockResolvedValue(null);
  const { result } = renderHook(() => useReplay());

  await act(async () => {
    await expect(result.current.loadReplay("missing")).rejects.toThrow(/introuvable/i);
  });
  expect(result.current.error).toEqual(expect.any(Error));
});

test("getCycle defaults to the current cycle of the loaded run", async () => {
  replayRepository.loadReplayRun.mockResolvedValue(run());
  const { result } = renderHook(() => useReplay());

  await act(async () => {
    await result.current.loadReplay("academie-c1-g1");
  });

  expect(result.current.getCycle().cycleIndex).toBe(0);
  expect(result.current.getCycle(1).cycleIndex).toBe(1);
});

test("nextCycle/previousCycle/jumpToCycle navigate within bounds", async () => {
  replayRepository.loadReplayRun.mockResolvedValue(run());
  const { result } = renderHook(() => useReplay());

  await act(async () => {
    await result.current.loadReplay("academie-c1-g1");
  });

  act(() => result.current.nextCycle());
  expect(result.current.replayState.currentCycleIndex).toBe(1);

  act(() => result.current.nextCycle()); // already at the last cycle, stays clamped
  expect(result.current.replayState.currentCycleIndex).toBe(1);

  act(() => result.current.previousCycle());
  expect(result.current.replayState.currentCycleIndex).toBe(0);

  act(() => result.current.jumpToCycle(1));
  expect(result.current.replayState.currentCycleIndex).toBe(1);
});

test("compareRuns loads both runs and returns their comparison", async () => {
  replayRepository.loadReplayRun.mockImplementation((runId) => Promise.resolve(run({ id: runId, ownerLabel: runId })));
  const { result } = renderHook(() => useReplay());

  let comparison;
  await act(async () => {
    comparison = await result.current.compareRuns("run-a", "run-b");
  });

  expect(comparison.scoring.a.runId).toBe("run-a");
  expect(comparison.scoring.b.runId).toBe("run-b");
  expect(comparison.timeline).toHaveLength(2);
  expect(comparison.kpiSeriesFor("profit").a).toEqual([500, 900]);
});

test("compareRuns reuses an already-loaded run instead of refetching it", async () => {
  replayRepository.loadReplayRun.mockResolvedValue(run());
  const { result } = renderHook(() => useReplay());

  await act(async () => {
    await result.current.loadReplay("academie-c1-g1");
  });
  replayRepository.loadReplayRun.mockClear();
  replayRepository.loadReplayRun.mockResolvedValue(run({ id: "run-b" }));

  await act(async () => {
    await result.current.compareRuns("academie-c1-g1", "run-b");
  });

  expect(replayRepository.loadReplayRun).toHaveBeenCalledTimes(1); // only run-b was fetched
});

test("exportReplay packages the current run without a network call", async () => {
  replayRepository.loadReplayRun.mockResolvedValue(run());
  const { result } = renderHook(() => useReplay());

  await act(async () => {
    await result.current.loadReplay("academie-c1-g1");
  });

  const exported = result.current.exportReplay();
  expect(exported.payload.id).toBe("academie-c1-g1");
  expect(JSON.parse(exported.json).id).toBe("academie-c1-g1");
  expect(exported.html).toContain("Groupe A");
});

test("exportReplay throws when nothing has been loaded", () => {
  const { result } = renderHook(() => useReplay());
  expect(() => result.current.exportReplay()).toThrow(/aucun replay/i);
});
