import { useCallback, useState } from "react";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import {
  applyRmAdvancedDecision as applyRmAdvancedDecisionPure,
  generateRmAdvancedReport,
  rmAdvancedFromCareerState,
} from "../lib/rmAdvanced/rmAdvancedEngine";
import rmAdvancedRepository from "../lib/rmAdvancedRepository";

// Drives the RM Advanced module: reads the player's own hotel bundle
// from CareerState (see context/CareerContext.jsx -- the same instance
// hooks/useClientsEngine.js/useRestaurantAdvanced.js already read) and
// layers the compression/displacement/pick-up curves/OTA strategy/
// special pricing/diagnostics/forecast lib/rmAdvanced/rmAdvancedEngine.js
// computes on top of it.
//
// A cycle only advances when Career's own day counter has moved since
// the last one was computed -- reopening the RM Advanced pages doesn't
// silently recompute figures on its own; only actually playing a new day
// (careerEngine.nextDay(), or an action applied through this hook) does.
// Same "day-counter sync" pattern as every other *Engine hook.
//
// Every action resolves the session itself (resolveSession()) before
// rmAdvancedRepository branches Supabase vs guest.
export function useRmAdvancedEngine() {
  const { reload: resolveSession } = useSupabaseSession();
  const career = useCareerContext();

  const [rmAdvancedState, setRmAdvancedState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useRmAdvancedEngine]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Loads the persisted RmAdvancedState, and recomputes a fresh cycle
  // only if Career has played a day since the last one was recorded.
  //
  // Same "self-poisoning persistence" guard as useClientsEngine.js/
  // useRestaurantAdvanced.js: never computes or persists before a real
  // hotel bundle exists.
  const loadRmAdvancedState = useCallback(
    (explicitCareerState) =>
      runWithErrorHandling(async () => {
        await resolveSession();
        const currentCareerState = explicitCareerState || career.careerState || (await career.loadCareerState().catch(() => null));
        const hotelBundle = currentCareerState?.hotel;
        if (!hotelBundle) {
          setRmAdvancedState(null);
          return null;
        }

        const stored = await rmAdvancedRepository.getRmAdvancedState();
        const careerDay = currentCareerState?.day ?? 0;
        const needsNewCycle = !stored || careerDay > (stored.cyclesElapsed ?? 0);
        const nextState = needsNewCycle ? rmAdvancedFromCareerState(currentCareerState, stored) : stored;

        setRmAdvancedState(nextState);
        if (needsNewCycle) {
          await rmAdvancedRepository.saveRmAdvancedState(nextState);
          await rmAdvancedRepository.saveRmAdvancedForecast(nextState.forecast);
          await rmAdvancedRepository.saveRmAdvancedDiagnostics(nextState.diagnostics);
        }
        return nextState;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [career, resolveSession, runWithErrorHandling]
  );

  // Applies an RM Advanced action (see lib/rmAdvanced/rmAdvancedActions.js's
  // RM_ADVANCED_ACTION_CATALOG) to the player's own hotel bundle through
  // useCareer.js's applyHotelAdjustment() -- same mechanism Clients/
  // Restaurant Advanced already use -- then recomputes the cycle from
  // the returned state.
  const applyRmAdvancedAction = useCallback(
    (actionId, payload = {}) =>
      runWithErrorHandling(async () => {
        const updatedCareerState = await career.applyHotelAdjustment((hotelBundle) =>
          applyRmAdvancedDecisionPure(hotelBundle, actionId, payload)
        );
        const nextState = rmAdvancedFromCareerState(updatedCareerState, rmAdvancedState);
        setRmAdvancedState(nextState);
        await rmAdvancedRepository.saveRmAdvancedState(nextState);
        await rmAdvancedRepository.saveRmAdvancedForecast(nextState.forecast);
        await rmAdvancedRepository.saveRmAdvancedDiagnostics(nextState.diagnostics);
        return nextState;
      }),
    [career, rmAdvancedState, runWithErrorHandling]
  );

  const getRmAdvancedForecast = useCallback(() => rmAdvancedState?.forecast || null, [rmAdvancedState]);
  const getCompression = useCallback(() => rmAdvancedState?.compression || null, [rmAdvancedState]);
  const getDisplacement = useCallback(() => rmAdvancedState?.displacement || null, [rmAdvancedState]);
  const getPickupCurves = useCallback(() => rmAdvancedState?.pickupCurves || null, [rmAdvancedState]);
  const getOtaStrategy = useCallback(() => rmAdvancedState?.otaStrategy || null, [rmAdvancedState]);
  const getSpecialPricing = useCallback(() => rmAdvancedState?.specialPricing || null, [rmAdvancedState]);
  const getRmAdvancedDiagnostics = useCallback(() => rmAdvancedState?.diagnostics || [], [rmAdvancedState]);
  const getRmAdvancedReport = useCallback(() => generateRmAdvancedReport(rmAdvancedState), [rmAdvancedState]);

  return {
    rmAdvancedState,
    isRunning,
    error,
    loadRmAdvancedState,
    getRmAdvancedForecast,
    getCompression,
    getDisplacement,
    getPickupCurves,
    getOtaStrategy,
    getSpecialPricing,
    getRmAdvancedDiagnostics,
    getRmAdvancedReport,
    applyRmAdvancedAction,
  };
}

export default useRmAdvancedEngine;
