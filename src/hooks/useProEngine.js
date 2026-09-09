import { useCallback, useState } from "react";
import { useSupabaseSession } from "./useSupabaseSession";
import {
  applyProAction as applyProActionPure,
  playProMonth as playProMonthPure,
  startPro as startProPure,
} from "../lib/pro/proEngine";
import proRepository from "../lib/proRepository";

// Drives the Professional Solo mode: a self-contained 24-month
// playthrough with its own embedded CareerState (see
// lib/pro/proState.js's own header comment for why this never touches
// context/CareerContext.jsx, unlike every other *Engine hook in this
// app) -- startPro()/playProMonth()/applyProAction() are pure
// lib/pro/proEngine.js functions; this hook only wires them to React
// state and to lib/proRepository.js's guest-aware persistence. Same
// pattern as hooks/useTfeEngine.js/useRmAdvancedEngine.js.
//
// Every action resolves the session itself (resolveSession()) before
// proRepository branches Supabase vs guest, so a mount-time load can't
// race ahead of the guest fallback.
export function useProEngine() {
  const { session, reload: resolveSession } = useSupabaseSession();

  const [proState, setProState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useProEngine]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // "choix du type d'hôtel / positionnement / stratégie professionnelle"
  // (pages/ProMenu.jsx): starts a fresh Pro run against the player's own
  // hotel choices and persists it immediately, so a page refresh right
  // after creation still resumes this exact run rather than losing it.
  const startPro = useCallback(
    (hotelConfig) =>
      runWithErrorHandling(async () => {
        const resolvedSession = await resolveSession();
        const playerId = resolvedSession?.user?.id || session?.user?.id || "moi";
        const nextState = startProPure({ playerId, hotelConfig });
        setProState(nextState);
        await proRepository.saveProState(nextState);
        return nextState;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolveSession, runWithErrorHandling]
  );

  // Loads whatever Pro run is already persisted for this player (guest
  // or Supabase) -- never auto-advances the month; only playProMonth()
  // does, on explicit request.
  const loadProState = useCallback(
    () =>
      runWithErrorHandling(async () => {
        await resolveSession();
        const stored = await proRepository.getProState();
        setProState(stored);
        return stored;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolveSession, runWithErrorHandling]
  );

  // Plays one month, persists the result, and (once the horizon is
  // reached) also persists the normalized report/score/forecast/
  // diagnostics rows -- see lib/proRepository.js's own header for why
  // those are additive copies of what pro_state already carries.
  const playProMonth = useCallback(
    (decisions = {}) =>
      runWithErrorHandling(async () => {
        const { state: nextState, monthReport } = await playProMonthPure({ proState, decisions });
        setProState(nextState);
        await proRepository.saveProState(nextState);
        await proRepository.saveProScore(nextState.score);
        await proRepository.saveProForecast(nextState.forecast);
        await proRepository.saveProDiagnostics(nextState.diagnostics);
        if (nextState.status === "completed" && nextState.report) {
          await proRepository.saveProReport(nextState.report);
        }
        return { state: nextState, monthReport };
      }),
    [proState, runWithErrorHandling]
  );

  // Applies a Pro action (see lib/pro/proActions.js's
  // PRO_ACTION_CATALOG) to the embedded career's own hotel bundle, then
  // persists the result -- pure, no month advance (see
  // lib/pro/proEngine.js's applyProAction()).
  const applyProAction = useCallback(
    (actionId, payload = {}) =>
      runWithErrorHandling(async () => {
        const nextState = applyProActionPure(proState, actionId, payload);
        setProState(nextState);
        await proRepository.saveProState(nextState);
        return nextState;
      }),
    [proState, runWithErrorHandling]
  );

  const getProDiagnostics = useCallback(() => proState?.diagnostics || [], [proState]);
  const getProForecast = useCallback(() => proState?.forecast || null, [proState]);
  const getProScore = useCallback(() => proState?.score || null, [proState]);
  const getProReport = useCallback(() => proState?.report || null, [proState]);

  return {
    proState,
    isRunning,
    error,
    startPro,
    loadProState,
    playProMonth,
    getProDiagnostics,
    getProForecast,
    getProScore,
    getProReport,
    applyProAction,
  };
}

export default useProEngine;
