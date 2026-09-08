import { useCallback, useState } from "react";
import { useSupabaseSession } from "./useSupabaseSession";
import {
  applyTfeAction as applyTfeActionPure,
  playTfeMonth as playTfeMonthPure,
  startTfe as startTfePure,
} from "../lib/tfe/tfeEngine";
import tfeRepository from "../lib/tfeRepository";

// Drives the TFE Solo mode: a self-contained 36-month playthrough with
// its own embedded CareerState (see lib/tfe/tfeState.js's own header
// comment for why this never touches context/CareerContext.jsx, unlike
// every other *Engine hook in this app) -- startTfe()/playTfeMonth()/
// applyTfeAction() are pure lib/tfe/tfeEngine.js functions; this hook
// only wires them to React state and to lib/tfeRepository.js's
// guest-aware persistence.
//
// Every action resolves the session itself (resolveSession()) before
// tfeRepository branches Supabase vs guest, so a mount-time load can't
// race ahead of the guest fallback (see useCareer.js's docstring for the
// same race pattern every other *Engine hook in this app already
// guards against).
export function useTfeEngine() {
  const { session, reload: resolveSession } = useSupabaseSession();

  const [tfeState, setTfeState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useTfeEngine]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // 1. "création d'un hôtel" (section 4's TfeMenu.jsx): starts a fresh
  // TFE run against the player's own hotel choices and persists it
  // immediately, so a page refresh right after creation still resumes
  // this exact run rather than losing it.
  const startTfe = useCallback(
    (hotelConfig) =>
      runWithErrorHandling(async () => {
        const resolvedSession = await resolveSession();
        const playerId = resolvedSession?.user?.id || session?.user?.id || "moi";
        const nextState = startTfePure({ playerId, hotelConfig });
        setTfeState(nextState);
        await tfeRepository.saveTfeState(nextState);
        return nextState;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolveSession, runWithErrorHandling]
  );

  // Loads whatever TFE run is already persisted for this player (guest
  // or Supabase) -- never auto-advances the month; only playTfeMonth()
  // does, on explicit request.
  const loadTfeState = useCallback(
    () =>
      runWithErrorHandling(async () => {
        await resolveSession();
        const stored = await tfeRepository.getTfeState();
        setTfeState(stored);
        return stored;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolveSession, runWithErrorHandling]
  );

  // 2. Plays one month, persists the result, and (once month 36 is
  // reached) also persists the normalized report/score/forecast rows --
  // see lib/tfeRepository.js's own header for why those are additive
  // copies of what tfe_state already carries.
  const playTfeMonth = useCallback(
    (decisions = {}) =>
      runWithErrorHandling(async () => {
        const { state: nextState, monthReport } = await playTfeMonthPure({ tfeState, decisions });
        setTfeState(nextState);
        await tfeRepository.saveTfeState(nextState);
        await tfeRepository.saveTfeScore(nextState.score);
        await tfeRepository.saveTfeForecast(nextState.forecast);
        if (nextState.status === "completed" && nextState.report) {
          await tfeRepository.saveTfeReport(nextState.report);
        }
        return { state: nextState, monthReport };
      }),
    [tfeState, runWithErrorHandling]
  );

  // Applies a TFE action (see lib/tfe/tfeActions.js's
  // TFE_ACTION_CATALOG) to the embedded career's own hotel bundle, then
  // persists the result -- pure, no month advance (see
  // lib/tfe/tfeEngine.js's applyTfeAction()).
  const applyTfeAction = useCallback(
    (actionId, payload = {}) =>
      runWithErrorHandling(async () => {
        const nextState = applyTfeActionPure(tfeState, actionId, payload);
        setTfeState(nextState);
        await tfeRepository.saveTfeState(nextState);
        return nextState;
      }),
    [tfeState, runWithErrorHandling]
  );

  const getTfeDiagnostics = useCallback(() => tfeState?.diagnostics || [], [tfeState]);
  const getTfeForecast = useCallback(() => tfeState?.forecast || null, [tfeState]);
  const getTfeScore = useCallback(() => tfeState?.score || null, [tfeState]);
  const getTfeReport = useCallback(() => tfeState?.report || null, [tfeState]);

  return {
    tfeState,
    isRunning,
    error,
    startTfe,
    loadTfeState,
    playTfeMonth,
    getTfeDiagnostics,
    getTfeForecast,
    getTfeScore,
    getTfeReport,
    applyTfeAction,
  };
}

export default useTfeEngine;
