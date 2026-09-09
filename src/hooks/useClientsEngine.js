import { useCallback, useState } from "react";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import {
  applyClientsDecision as applyClientsDecisionPure,
  generateClientsReport,
  clientsFromCareerState,
} from "../lib/clients/clientsEngine";
import clientsRepository from "../lib/clientsRepository";

// Drives the Clients module: reads the player's own hotel bundle from
// CareerState (see context/CareerContext.jsx -- the same instance hooks/
// useHousekeepingEngine.js/useEsgEngine.js/useMarketingEngine.js already
// read) and layers the segments/satisfaction/reviews/loyalty/behaviors/
// complaints/diagnostics/forecast lib/clients/clientsEngine.js computes
// on top of it.
//
// A clients cycle only advances when Career's own day counter has moved
// since the last one was computed -- reopening the Clients pages doesn't
// silently recompute figures on its own; only actually playing a new day
// (careerEngine.nextDay(), or a clients action applied through this hook)
// does. Same "day-counter sync" pattern as every other *Engine hook.
//
// Every action resolves the session itself (resolveSession()) before
// clientsRepository branches Supabase vs guest.
export function useClientsEngine() {
  const { reload: resolveSession } = useSupabaseSession();
  const career = useCareerContext();

  const [clientsState, setClientsState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useClientsEngine]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Loads the persisted ClientsState, and recomputes a fresh cycle only
  // if Career has played a day since the last one was recorded.
  //
  // Same "self-poisoning persistence" guard as useHousekeepingEngine.js:
  // never computes or persists before a real hotel bundle exists.
  const loadClientsState = useCallback(
    (explicitCareerState) =>
      runWithErrorHandling(async () => {
        await resolveSession();
        const currentCareerState = explicitCareerState || career.careerState || (await career.loadCareerState().catch(() => null));
        const hotelBundle = currentCareerState?.hotel;
        if (!hotelBundle) {
          setClientsState(null);
          return null;
        }

        const stored = await clientsRepository.getClientsState();
        const careerDay = currentCareerState?.day ?? 0;
        const needsNewCycle = !stored || careerDay > (stored.cyclesElapsed ?? 0);
        const nextState = needsNewCycle ? clientsFromCareerState(currentCareerState, stored) : stored;

        setClientsState(nextState);
        if (needsNewCycle) {
          await clientsRepository.saveClientsState(nextState);
          await clientsRepository.saveClientsForecast(nextState.forecast);
        }
        return nextState;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [career, resolveSession, runWithErrorHandling]
  );

  // Applies a clients action (see lib/clients/clientsActions.js's
  // CLIENTS_ACTION_CATALOG) to the player's own hotel bundle through
  // useCareer.js's applyHotelAdjustment() -- same mechanism Finance/
  // Staff/Marketing/ESG/Housekeeping already use -- then recomputes the
  // clients cycle from the returned state.
  const applyClientsAction = useCallback(
    (actionId, payload = {}) =>
      runWithErrorHandling(async () => {
        const updatedCareerState = await career.applyHotelAdjustment((hotelBundle) =>
          applyClientsDecisionPure(hotelBundle, actionId, payload)
        );
        const nextState = clientsFromCareerState(updatedCareerState, clientsState);
        setClientsState(nextState);
        await clientsRepository.saveClientsState(nextState);
        await clientsRepository.saveClientsForecast(nextState.forecast);
        return nextState;
      }),
    [career, clientsState, runWithErrorHandling]
  );

  const getClientsDiagnostics = useCallback(() => clientsState?.diagnostics || [], [clientsState]);
  const getClientsForecast = useCallback(() => clientsState?.forecast || null, [clientsState]);
  const getSegments = useCallback(() => clientsState?.segments || null, [clientsState]);
  const getReviews = useCallback(() => clientsState?.reviews || null, [clientsState]);
  const getLoyalty = useCallback(() => clientsState?.loyalty ?? null, [clientsState]);
  const getClientsReport = useCallback(() => generateClientsReport(clientsState), [clientsState]);

  return {
    clientsState,
    isRunning,
    error,
    loadClientsState,
    getClientsDiagnostics,
    getClientsForecast,
    getSegments,
    getReviews,
    getLoyalty,
    getClientsReport,
    applyClientsAction,
  };
}

export default useClientsEngine;
