import { useCallback, useState } from "react";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import { applyHousekeepingDecision as applyHousekeepingDecisionPure, generateHousekeepingReport, housekeepingFromCareerState } from "../lib/housekeeping/housekeepingEngine";
import housekeepingRepository from "../lib/housekeepingRepository";

// Drives the Housekeeping module: reads the player's own hotel bundle
// from CareerState (see context/CareerContext.jsx -- the same instance
// hooks/useFinance.js/useStaffEngine.js/useMarketingEngine.js/
// useEsgEngine.js already read) and layers the charge/temps de
// nettoyage/productivité/surcharge/sous-effectif/qualité/diagnostics/
// forecast lib/housekeeping/housekeepingEngine.js computes on top of it.
//
// A housekeeping cycle only advances when Career's own day counter has
// moved since the last one was computed -- reopening the Housekeeping
// pages doesn't silently recompute figures on its own; only actually
// playing a new day (careerEngine.nextDay(), or an HK action applied
// through this hook) does. Same "day-counter sync" pattern as every
// other *Engine hook in this app.
//
// Every action resolves the session itself (resolveSession()) before
// housekeepingRepository branches Supabase vs guest, so a mount-time
// load can't race ahead of the guest fallback.
export function useHousekeepingEngine() {
  const { reload: resolveSession } = useSupabaseSession();
  const career = useCareerContext();

  const [housekeepingState, setHousekeepingState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useHousekeepingEngine]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Loads the persisted HousekeepingState, and recomputes a fresh cycle
  // only if Career has played a day since the last one was recorded.
  //
  // Never computes (or persists) anything before a real hotel bundle
  // exists: this is the same "self-poisoning persistence" bug hooks/
  // useFinance.js's loadFinanceState() hit and fixed -- without this
  // guard, the mount-time call every Housekeeping page makes (before the
  // player has necessarily started a career yet) would compute and save
  // an all-zero cycle from an empty bundle, permanently stuck at
  // cyclesElapsed: 1.
  const loadHousekeepingState = useCallback(
    (explicitCareerState) =>
      runWithErrorHandling(async () => {
        await resolveSession();
        const currentCareerState = explicitCareerState || career.careerState || (await career.loadCareerState().catch(() => null));
        const hotelBundle = currentCareerState?.hotel;
        if (!hotelBundle) {
          setHousekeepingState(null);
          return null;
        }

        const stored = await housekeepingRepository.getHousekeepingState();
        const careerDay = currentCareerState?.day ?? 0;
        const needsNewCycle = !stored || careerDay > (stored.cyclesElapsed ?? 0);
        const nextState = needsNewCycle
          ? housekeepingFromCareerState(currentCareerState, stored)
          : stored;

        setHousekeepingState(nextState);
        if (needsNewCycle) {
          await housekeepingRepository.saveHousekeepingState(nextState);
          await housekeepingRepository.saveHousekeepingForecast(nextState.forecast);
        }
        return nextState;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [career, resolveSession, runWithErrorHandling]
  );

  // Applies an HK action (see lib/housekeeping/housekeepingEngine.js's
  // HOUSEKEEPING_ACTION_CATALOG) to the player's own hotel bundle
  // through useCareer.js's applyHotelAdjustment() -- the same mechanism
  // Finance/Staff/Marketing/ESG already use -- then recomputes the HK
  // cycle from the outcome it returns (not from career.careerState,
  // which won't reflect the update until the next render).
  const applyHousekeepingAction = useCallback(
    (actionId, payload = {}) =>
      runWithErrorHandling(async () => {
        const updatedCareerState = await career.applyHotelAdjustment((hotelBundle) => applyHousekeepingDecisionPure(hotelBundle, actionId, payload));
        const nextState = housekeepingFromCareerState(updatedCareerState, housekeepingState);
        setHousekeepingState(nextState);
        await housekeepingRepository.saveHousekeepingState(nextState);
        await housekeepingRepository.saveHousekeepingForecast(nextState.forecast);
        return nextState;
      }),
    [career, housekeepingState, runWithErrorHandling]
  );

  const getHousekeepingDiagnostics = useCallback(() => housekeepingState?.diagnostics || [], [housekeepingState]);
  const getHousekeepingForecast = useCallback(() => housekeepingState?.forecast || null, [housekeepingState]);
  const getQualityScore = useCallback(() => housekeepingState?.quality ?? null, [housekeepingState]);
  const getHousekeepingReport = useCallback(() => generateHousekeepingReport(housekeepingState), [housekeepingState]);

  return {
    housekeepingState,
    isRunning,
    error,
    loadHousekeepingState,
    getHousekeepingDiagnostics,
    getHousekeepingForecast,
    getQualityScore,
    getHousekeepingReport,
    applyHousekeepingAction,
  };
}

export default useHousekeepingEngine;
