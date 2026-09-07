import { useCallback, useState } from "react";
import { createReplayState, findReplayRun } from "../lib/replay/replayState";
import { getCycleForRun, goToNextCycle, goToPreviousCycle, jumpToCycleIndex, loadReplayRun as loadRunIntoState } from "../lib/replay/replayEngine";
import { compareKpiSeries, compareScoring, compareTimelines } from "../lib/replay/replayComparison";
import { buildExportPayload, buildSummaryHtml, toJson } from "../lib/replay/replayExport";
import replayRepository from "../lib/replay/replayRepository";

// Drives the Replay module: loads a persisted run (Academy group,
// Competition player, or a standalone Scenario/TFE run -- see
// lib/replay/replayEngine.js's adapters and replayRepository.js), lets
// the viewer scrub cycle by cycle, compares two runs, and packages an
// export. A load failure surfaces as `error` rather than silently
// reverting to demo data.
export function useReplay() {
  const [replayState, setReplayState] = useState(createReplayState());
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useReplay]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const loadReplay = useCallback(
    (runId) =>
      runWithErrorHandling(async () => {
        const run = await replayRepository.loadReplayRun(runId);
        if (!run) throw new Error(`Replay introuvable : ${runId}.`);
        setReplayState((previous) => loadRunIntoState(previous, run));
        return run;
      }),
    [runWithErrorHandling]
  );

  // Reads a cycle of the currently-loaded run; defaults to whichever
  // cycle the viewer is currently on.
  const getCycle = useCallback(
    (cycleIndex) => {
      const run = findReplayRun(replayState, replayState.currentRunId);
      return getCycleForRun(run, cycleIndex ?? replayState.currentCycleIndex);
    },
    [replayState]
  );

  const nextCycle = useCallback(() => setReplayState((previous) => goToNextCycle(previous)), []);
  const previousCycle = useCallback(() => setReplayState((previous) => goToPreviousCycle(previous)), []);
  const jumpToCycle = useCallback((cycleIndex) => setReplayState((previous) => jumpToCycleIndex(previous, cycleIndex)), []);

  // Loads (if not already loaded) both runs and returns their comparison.
  const compareRuns = useCallback(
    (runIdA, runIdB) =>
      runWithErrorHandling(async () => {
        const [runA, runB] = await Promise.all([
          findReplayRun(replayState, runIdA) || replayRepository.loadReplayRun(runIdA),
          findReplayRun(replayState, runIdB) || replayRepository.loadReplayRun(runIdB),
        ]);
        if (!runA || !runB) throw new Error("Impossible de comparer : un des deux replays est introuvable.");

        setReplayState((previous) => ({ ...previous, runsById: { ...previous.runsById, [runA.id]: runA, [runB.id]: runB } }));

        return {
          runA,
          runB,
          timeline: compareTimelines(runA, runB),
          scoring: compareScoring(runA, runB),
          kpiSeriesFor: (kpiKey) => compareKpiSeries(runA, runB, kpiKey),
        };
      }),
    [replayState, runWithErrorHandling]
  );

  // Packages the given run (defaults to the current one) for export --
  // synchronous, no network: the run is already loaded in state.
  const exportReplay = useCallback(
    (runId) => {
      const run = findReplayRun(replayState, runId || replayState.currentRunId);
      if (!run) throw new Error("Aucun replay chargé à exporter.");
      return { payload: buildExportPayload(run), json: toJson(run), html: buildSummaryHtml(run) };
    },
    [replayState]
  );

  return {
    replayState,
    isRunning,
    error,
    loadReplay,
    getCycle,
    nextCycle,
    previousCycle,
    jumpToCycle,
    compareRuns,
    exportReplay,
  };
}
