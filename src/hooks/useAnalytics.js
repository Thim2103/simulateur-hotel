import { useCallback, useState } from "react";
import { addAnalysis, createAnalyticsState, findAnalysis } from "../lib/analytics/analyticsState";
import { analyzeCycle as analyzeCyclePure, analyzeRun as analyzeRunPure, compareRuns as compareRunsPure, generateReport } from "../lib/analytics/analyticsEngine";
import replayRepository from "../lib/replay/replayRepository";
import analyticsRepository from "../lib/analytics/analyticsRepository";

// Drives the Analytics module: loads a run's replay (see
// lib/replay/replayRepository.js), runs every analysis pass over it (see
// lib/analytics/analyticsEngine.js -- KPIs, decisions, events,
// diagnostics, recommendations), and caches the result both locally and
// in Supabase (analyticsRepository.js). A load failure surfaces as
// `error` rather than silently reverting to demo data.
export function useAnalytics() {
  const [analyticsState, setAnalyticsState] = useState(createAnalyticsState());
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useAnalytics]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Loads (if not already analyzed) and returns a run's full analysis,
  // reusing the cached one from state when available.
  const ensureAnalysis = useCallback(
    async (runId) => {
      const cached = findAnalysis(analyticsState, runId);
      if (cached) return cached;
      const replayRun = await replayRepository.loadReplayRun(runId);
      if (!replayRun) throw new Error(`Replay introuvable : ${runId}.`);
      return analyzeRunPure(replayRun);
    },
    [analyticsState]
  );

  const analyzeRun = useCallback(
    (runId) =>
      runWithErrorHandling(async () => {
        const analysis = await ensureAnalysis(runId);
        setAnalyticsState((previous) => addAnalysis(previous, analysis));
        await analyticsRepository.saveAnalysis(analysis);
        return analysis;
      }),
    [ensureAnalysis, runWithErrorHandling]
  );

  const analyzeCycle = useCallback(
    (runId, cycleIndex) =>
      runWithErrorHandling(async () => {
        const analysis = await ensureAnalysis(runId);
        setAnalyticsState((previous) => addAnalysis(previous, analysis));
        return analyzeCyclePure(analysis.replayRun, cycleIndex);
      }),
    [ensureAnalysis, runWithErrorHandling]
  );

  const compareRuns = useCallback(
    (runIdA, runIdB) =>
      runWithErrorHandling(async () => {
        const [analysisA, analysisB] = await Promise.all([ensureAnalysis(runIdA), ensureAnalysis(runIdB)]);
        setAnalyticsState((previous) => addAnalysis(addAnalysis(previous, analysisA), analysisB));
        return compareRunsPure(analysisA, analysisB);
      }),
    [ensureAnalysis, runWithErrorHandling]
  );

  // Not in the originally requested function list, but necessary:
  // AnalyticsDashboard.jsx's "liste des analyses" has nowhere else to
  // read that list from.
  const listAnalyses = useCallback(
    () => runWithErrorHandling(() => analyticsRepository.listAnalyses()),
    [runWithErrorHandling]
  );

  const generateAnalyticsReport = useCallback(
    (runId) =>
      runWithErrorHandling(async () => {
        const analysis = await ensureAnalysis(runId);
        setAnalyticsState((previous) => addAnalysis(previous, analysis));
        const report = generateReport(analysis);
        await analyticsRepository.saveReport(runId, report);
        return report;
      }),
    [ensureAnalysis, runWithErrorHandling]
  );

  return {
    analyticsState,
    isRunning,
    error,
    analyzeRun,
    analyzeCycle,
    compareRuns,
    generateAnalyticsReport,
    listAnalyses,
  };
}
