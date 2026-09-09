import { useCallback, useState } from "react";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import {
  applyRestaurantAdvancedDecision as applyRestaurantAdvancedDecisionPure,
  generateRestaurantAdvancedReport,
  restaurantAdvancedFromCareerState,
} from "../lib/restaurantAdvanced/restaurantAdvancedEngine";
import restaurantAdvancedRepository from "../lib/restaurantAdvancedRepository";

// Drives the Restaurant Advanced module: reads the player's own hotel
// bundle from CareerState (see context/CareerContext.jsx -- the same
// instance hooks/useClientsEngine.js/useHousekeepingEngine.js already
// read) and layers the food cost/popularity/profitability/menu
// engineering/diagnostics/forecast lib/restaurantAdvanced/
// restaurantAdvancedEngine.js computes on top of it.
//
// A cycle only advances when Career's own day counter has moved since
// the last one was computed -- reopening the Restaurant Advanced pages
// doesn't silently recompute figures on its own; only actually playing a
// new day (careerEngine.nextDay(), or an action applied through this
// hook) does. Same "day-counter sync" pattern as every other *Engine hook.
//
// Every action resolves the session itself (resolveSession()) before
// restaurantAdvancedRepository branches Supabase vs guest.
export function useRestaurantAdvanced() {
  const { reload: resolveSession } = useSupabaseSession();
  const career = useCareerContext();

  const [restaurantAdvancedState, setRestaurantAdvancedState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useRestaurantAdvanced]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Loads the persisted RestaurantAdvancedState, and recomputes a fresh
  // cycle only if Career has played a day since the last one was recorded.
  //
  // Same "self-poisoning persistence" guard as useClientsEngine.js: never
  // computes or persists before a real hotel bundle exists.
  const loadRestaurantAdvancedState = useCallback(
    (explicitCareerState) =>
      runWithErrorHandling(async () => {
        await resolveSession();
        const currentCareerState = explicitCareerState || career.careerState || (await career.loadCareerState().catch(() => null));
        const hotelBundle = currentCareerState?.hotel;
        if (!hotelBundle) {
          setRestaurantAdvancedState(null);
          return null;
        }

        const stored = await restaurantAdvancedRepository.getRestaurantAdvancedState();
        const careerDay = currentCareerState?.day ?? 0;
        const needsNewCycle = !stored || careerDay > (stored.cyclesElapsed ?? 0);
        const nextState = needsNewCycle ? restaurantAdvancedFromCareerState(currentCareerState, stored) : stored;

        setRestaurantAdvancedState(nextState);
        if (needsNewCycle) {
          await restaurantAdvancedRepository.saveRestaurantAdvancedState(nextState);
          await restaurantAdvancedRepository.saveRestaurantAdvancedForecast(nextState.forecast);
        }
        return nextState;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [career, resolveSession, runWithErrorHandling]
  );

  // Applies a Restaurant Advanced action (see
  // lib/restaurantAdvanced/restaurantActions.js's RESTAURANT_ACTION_CATALOG)
  // to the player's own hotel bundle through useCareer.js's
  // applyHotelAdjustment() -- same mechanism Clients/Finance/Staff/ESG
  // already use -- then recomputes the cycle from the returned state.
  const applyRestaurantAction = useCallback(
    (actionId, payload = {}) =>
      runWithErrorHandling(async () => {
        const updatedCareerState = await career.applyHotelAdjustment((hotelBundle) =>
          applyRestaurantAdvancedDecisionPure(hotelBundle, actionId, payload)
        );
        const nextState = restaurantAdvancedFromCareerState(updatedCareerState, restaurantAdvancedState);
        setRestaurantAdvancedState(nextState);
        await restaurantAdvancedRepository.saveRestaurantAdvancedState(nextState);
        await restaurantAdvancedRepository.saveRestaurantAdvancedForecast(nextState.forecast);
        return nextState;
      }),
    [career, restaurantAdvancedState, runWithErrorHandling]
  );

  const getMenuEngineering = useCallback(() => restaurantAdvancedState?.menuEngineering || null, [restaurantAdvancedState]);
  const getFoodCost = useCallback(() => restaurantAdvancedState?.foodCost || null, [restaurantAdvancedState]);
  const getPopularity = useCallback(() => restaurantAdvancedState?.popularity || null, [restaurantAdvancedState]);
  const getProfitability = useCallback(() => restaurantAdvancedState?.profitability || null, [restaurantAdvancedState]);
  const getRestaurantForecast = useCallback(() => restaurantAdvancedState?.forecast || null, [restaurantAdvancedState]);
  const getRestaurantDiagnostics = useCallback(() => restaurantAdvancedState?.diagnostics || [], [restaurantAdvancedState]);
  const getRestaurantAdvancedReport = useCallback(
    () => generateRestaurantAdvancedReport(restaurantAdvancedState),
    [restaurantAdvancedState]
  );

  return {
    restaurantAdvancedState,
    isRunning,
    error,
    loadRestaurantAdvancedState,
    getMenuEngineering,
    getFoodCost,
    getPopularity,
    getProfitability,
    getRestaurantForecast,
    getRestaurantDiagnostics,
    getRestaurantAdvancedReport,
    applyRestaurantAction,
  };
}

export default useRestaurantAdvanced;
