import { useCallback, useState } from "react";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import { applyEsgAction as applyEsgActionPure, generateEsgReport, runEsgCycle } from "../lib/esg/esgEngine";
import { staffFromCareerState } from "../lib/staff/staffEngine";
import esgRepository from "../lib/esgRepository";

// Drives the ESG module: reads the player's own hotel bundle from
// CareerState (see context/CareerContext.jsx -- the same instance
// hooks/useFinance.js/useStaffEngine.js/useMarketingEngine.js already
// read) and layers the énergie/eau/déchets/CO₂/score/certifications/
// diagnostics/forecast lib/esg/esgEngine.js computes on top of it.
//
// An ESG cycle only advances when Career's own day counter has moved
// since the last one was computed -- reopening the ESG pages doesn't
// silently recompute figures on its own; only actually playing a new day
// (careerEngine.nextDay(), or an ESG action applied through this hook)
// does. Same "day-counter sync" pattern as hooks/useFinance.js/
// useStaffEngine.js/useMarketingEngine.js.
//
// Every action resolves the session itself (resolveSession()) before
// esgRepository branches Supabase vs guest, so a mount-time load can't
// race ahead of the guest fallback.
export function useEsgEngine() {
  const { reload: resolveSession } = useSupabaseSession();
  const career = useCareerContext();

  const [esgState, setEsgState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useEsgEngine]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Loads the persisted EsgState, and recomputes a fresh cycle only if
  // Career has played a day since the last one was recorded.
  //
  // Never computes (or persists) anything before a real hotel bundle
  // exists: this is the same "self-poisoning persistence" bug hooks/
  // useFinance.js's loadFinanceState() hit and fixed -- without this
  // guard, the mount-time call every ESG page makes (before the player
  // has necessarily started a career yet) would compute and save an
  // all-zero cycle from an empty bundle, permanently stuck at
  // cyclesElapsed: 1.
  const loadEsgState = useCallback(
    (explicitCareerState) =>
      runWithErrorHandling(async () => {
        await resolveSession();
        const currentCareerState = explicitCareerState || career.careerState || (await career.loadCareerState().catch(() => null));
        const hotelBundle = currentCareerState?.hotel;
        if (!hotelBundle) {
          setEsgState(null);
          return null;
        }

        const stored = await esgRepository.getEsgState();
        const careerDay = currentCareerState?.day ?? 0;
        const needsNewCycle = !stored || careerDay > (stored.cyclesElapsed ?? 0);
        const staff = needsNewCycle ? staffFromCareerState(currentCareerState) : null;
        const nextState = needsNewCycle
          ? runEsgCycle({ hotelBundle, staffMorale: staff?.morale ?? null, staffOverload: staff?.overload ?? null, previousState: stored })
          : stored;

        setEsgState(nextState);
        if (needsNewCycle) {
          await esgRepository.saveEsgState(nextState);
          await esgRepository.saveEsgForecast(nextState.forecast);
          await esgRepository.saveEsgCertifications(nextState.certifications);
        }
        return nextState;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [career, resolveSession, runWithErrorHandling]
  );

  // Applies an ESG action (see lib/esg/esgEngine.js's ESG_ACTION_CATALOG)
  // to the player's own hotel bundle through useCareer.js's
  // applyHotelAdjustment() -- the same mechanism Finance/Staff/Marketing
  // already use -- then recomputes the ESG cycle from the outcome it
  // returns (not from career.careerState, which won't reflect the update
  // until the next render).
  const applyEsgAction = useCallback(
    (actionId, payload = {}) =>
      runWithErrorHandling(async () => {
        const updatedCareerState = await career.applyHotelAdjustment((hotelBundle) => applyEsgActionPure(hotelBundle, actionId, payload, esgState));
        const staff = staffFromCareerState(updatedCareerState);
        const nextState = runEsgCycle({ hotelBundle: updatedCareerState.hotel, staffMorale: staff?.morale ?? null, staffOverload: staff?.overload ?? null, previousState: esgState });
        setEsgState(nextState);
        await esgRepository.saveEsgState(nextState);
        await esgRepository.saveEsgForecast(nextState.forecast);
        await esgRepository.saveEsgCertifications(nextState.certifications);
        return nextState;
      }),
    [career, esgState, runWithErrorHandling]
  );

  const getEsgDiagnostics = useCallback(() => esgState?.diagnostics || [], [esgState]);
  const getEsgForecast = useCallback(() => esgState?.forecast || null, [esgState]);
  const getCertifications = useCallback(() => esgState?.certifications || [], [esgState]);
  const getEsgReport = useCallback(() => generateEsgReport(esgState), [esgState]);

  return {
    esgState,
    isRunning,
    error,
    loadEsgState,
    getEsgDiagnostics,
    getEsgForecast,
    getCertifications,
    getEsgReport,
    applyEsgAction,
  };
}

export default useEsgEngine;
