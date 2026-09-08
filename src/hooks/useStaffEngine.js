import { useCallback, useState } from "react";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import { applyStaffDecision as applyStaffDecisionPure, generateStaffReport, runStaffCycle } from "../lib/staff/staffEngine";
import staffRepository from "../lib/staffRepository";

// Drives the Staff module: reads the player's own hotel bundle (and
// latest DailyReport) from CareerState (see context/CareerContext.jsx --
// the same instance hooks/useFinance.js/useDashboard.js already read) and
// layers the headcount/moral/productivité/absentéisme/surcharge/turnover/
// coûts RH/diagnostics/forecast lib/staff/staffEngine.js computes on top
// of it.
//
// An HR cycle only advances when Career's own day counter has moved since
// the last one was computed -- reopening the Staff pages doesn't silently
// rack up cycles on its own; only actually playing a new day
// (careerEngine.nextDay(), or an HR action applied through this hook)
// does. Same "day-counter sync" pattern as hooks/useFinance.js.
//
// Every action resolves the session itself (resolveSession()) before
// staffRepository branches Supabase vs guest, so a mount-time load can't
// race ahead of the guest fallback.
export function useStaffEngine() {
  const { reload: resolveSession } = useSupabaseSession();
  const career = useCareerContext();

  const [staffState, setStaffState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useStaffEngine]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Loads the persisted StaffState, and recomputes a fresh cycle only if
  // Career has played a day since the last one was recorded (compares the
  // CareerState's own `day` against the stored cyclesElapsed).
  //
  // Never computes (or persists) anything before a real hotel bundle
  // exists: this is the same "self-poisoning persistence" bug hooks/
  // useFinance.js's loadFinanceState() hit and fixed -- without this
  // guard, the mount-time call every Staff page makes (before the player
  // has necessarily started a career yet) would compute and save an
  // all-zero cycle from an empty bundle, permanently stuck at
  // cyclesElapsed: 1: once a real career starts at day 0, `0 > 1` is
  // false, so that all-zero cycle would never get replaced.
  const loadStaffState = useCallback(
    (explicitCareerState) =>
      runWithErrorHandling(async () => {
        await resolveSession();
        const currentCareerState = explicitCareerState || career.careerState || (await career.loadCareerState().catch(() => null));
        const hotelBundle = currentCareerState?.hotel;
        if (!hotelBundle) {
          setStaffState(null);
          return null;
        }

        const stored = await staffRepository.getStaffState();
        const careerDay = currentCareerState?.day ?? 0;
        const needsNewCycle = !stored || careerDay > (stored.cyclesElapsed ?? 0);
        const nextState = needsNewCycle
          ? runStaffCycle({ hotelBundle, dailyReport: currentCareerState?.lastDayReport, previousState: stored })
          : stored;

        setStaffState(nextState);
        if (needsNewCycle) {
          await staffRepository.saveStaffState(nextState);
          await staffRepository.saveStaffForecast(nextState.forecast);
        }
        return nextState;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [career, resolveSession, runWithErrorHandling]
  );

  // Applies an HR action (see lib/staff/staffEngine.js's
  // STAFF_ACTION_CATALOG) to the player's own hotel bundle through
  // useCareer.js's applyHotelAdjustment() -- the same mechanism
  // Dashboard.jsx's Quick Actions and Finance's applyFinancialDecision()
  // already use -- then recomputes the HR cycle from the outcome it
  // returns (not from career.careerState, which won't reflect the update
  // until the next render; see useFinance.js's applyFinancialDecision()
  // docstring for the same race).
  const applyStaffAction = useCallback(
    (actionId, payload = {}) =>
      runWithErrorHandling(async () => {
        const updatedCareerState = await career.applyHotelAdjustment((hotelBundle) => applyStaffDecisionPure(hotelBundle, actionId, payload));
        const nextState = runStaffCycle({ hotelBundle: updatedCareerState.hotel, dailyReport: updatedCareerState.lastDayReport, previousState: staffState });
        setStaffState(nextState);
        await staffRepository.saveStaffState(nextState);
        await staffRepository.saveStaffForecast(nextState.forecast);
        return nextState;
      }),
    [career, staffState, runWithErrorHandling]
  );

  const getStaffDiagnostics = useCallback(() => staffState?.diagnostics || [], [staffState]);
  const getStaffForecast = useCallback(() => staffState?.forecast || null, [staffState]);
  const getStaffReport = useCallback(() => generateStaffReport(staffState), [staffState]);

  return {
    staffState,
    isRunning,
    error,
    loadStaffState,
    getStaffDiagnostics,
    getStaffForecast,
    getStaffReport,
    applyStaffAction,
  };
}

export default useStaffEngine;
