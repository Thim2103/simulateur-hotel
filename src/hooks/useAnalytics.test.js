import { renderHook, act } from "@testing-library/react";
import { useAnalytics } from "./useAnalytics";
import replayRepository from "../lib/replay/replayRepository";
import analyticsRepository from "../lib/analytics/analyticsRepository";

jest.mock("../lib/replay/replayRepository", () => ({
  loadReplayRun: jest.fn(),
}));

jest.mock("../lib/analytics/analyticsRepository", () => ({
  saveAnalysis: jest.fn(),
  saveReport: jest.fn(),
  listAnalyses: jest.fn(),
}));

function replayRun(overrides = {}) {
  return {
    id: "academie-c1-g1",
    source: "academie",
    ownerLabel: "Groupe A",
    scenarioTitle: "Budget serré",
    status: "finished",
    totalCycles: 2,
    scoreHistory: [40, 70],
    cycles: [
      { cycleIndex: 0, score: 40, baseReport: { profit: 500 }, scenarioEvents: [], decisions: {} },
      { cycleIndex: 1, score: 70, baseReport: { profit: 900 }, scenarioEvents: [{ id: "rush" }], decisions: { pricingADR: 150 } },
    ],
    finalReport: { objectivesResults: [] },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  analyticsRepository.saveAnalysis.mockResolvedValue({});
  analyticsRepository.saveReport.mockResolvedValue({});
});

test("analyzeRun loads the replay, analyzes it, caches it locally and persists it", async () => {
  replayRepository.loadReplayRun.mockResolvedValue(replayRun());
  const { result } = renderHook(() => useAnalytics());

  let analysis;
  await act(async () => {
    analysis = await result.current.analyzeRun("academie-c1-g1");
  });

  expect(analysis.runId).toBe("academie-c1-g1");
  expect(analysis.kpis.profit).toBeDefined();
  expect(result.current.analyticsState.analysesById["academie-c1-g1"]).toBe(analysis);
  expect(analyticsRepository.saveAnalysis).toHaveBeenCalledWith(analysis);
});

test("analyzeRun surfaces an error for an unknown replay", async () => {
  replayRepository.loadReplayRun.mockResolvedValue(null);
  const { result } = renderHook(() => useAnalytics());

  await act(async () => {
    await expect(result.current.analyzeRun("missing")).rejects.toThrow(/introuvable/i);
  });
  expect(result.current.error).toEqual(expect.any(Error));
});

test("analyzeCycle reuses an already-analyzed run instead of refetching it", async () => {
  replayRepository.loadReplayRun.mockResolvedValue(replayRun());
  const { result } = renderHook(() => useAnalytics());

  await act(async () => {
    await result.current.analyzeRun("academie-c1-g1");
  });
  replayRepository.loadReplayRun.mockClear();

  let cycleAnalysis;
  await act(async () => {
    cycleAnalysis = await result.current.analyzeCycle("academie-c1-g1", 1);
  });

  expect(cycleAnalysis.cycleIndex).toBe(1);
  expect(replayRepository.loadReplayRun).not.toHaveBeenCalled();
});

test("compareRuns analyzes both runs and returns a full comparison", async () => {
  replayRepository.loadReplayRun.mockImplementation((runId) => Promise.resolve(replayRun({ id: runId, ownerLabel: runId })));
  const { result } = renderHook(() => useAnalytics());

  let comparison;
  await act(async () => {
    comparison = await result.current.compareRuns("run-a", "run-b");
  });

  expect(comparison.runA.id).toBe("run-a");
  expect(comparison.runB.id).toBe("run-b");
  expect(result.current.analyticsState.analysesById["run-a"]).toBeDefined();
  expect(result.current.analyticsState.analysesById["run-b"]).toBeDefined();
});

test("generateAnalyticsReport builds and persists the final report", async () => {
  replayRepository.loadReplayRun.mockResolvedValue(replayRun());
  const { result } = renderHook(() => useAnalytics());

  let report;
  await act(async () => {
    report = await result.current.generateAnalyticsReport("academie-c1-g1");
  });

  expect(report).toEqual(expect.objectContaining({ runId: "academie-c1-g1", finalScore: 70 }));
  expect(analyticsRepository.saveReport).toHaveBeenCalledWith("academie-c1-g1", report);
});

test("listAnalyses returns the persisted analysis roster", async () => {
  analyticsRepository.listAnalyses.mockResolvedValue([{ runId: "academie-c1-g1", ownerLabel: "Groupe A" }]);
  const { result } = renderHook(() => useAnalytics());

  let list;
  await act(async () => {
    list = await result.current.listAnalyses();
  });

  expect(list).toEqual([{ runId: "academie-c1-g1", ownerLabel: "Groupe A" }]);
});
