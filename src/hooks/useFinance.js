import { useCallback, useState } from "react";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import { applyFinancialDecision as applyFinancialDecisionPure, runFinanceCycle } from "../lib/finance/financeEngine";
import { generateFinancialReport } from "../lib/finance/financeReports";
import financeRepository from "../lib/financeRepository";

// Drives the Finance module: reads the player's own hotel bundle from
// CareerState (see context/CareerContext.jsx -- the same instance
// Dashboard.jsx's useDashboard.js already reads) and layers the income
// statement/balance sheet/cash-flow/ratios/diagnostics/forecast
// lib/finance/financeEngine.js computes on top of it (see
// financeEngine.js's own docstring for why it doesn't re-simulate
// revenue/expenses itself).
//
// A finance cycle only advances when Career's own day counter has moved
// since the last one was computed -- reopening the Finance pages doesn't
// silently rack up cycles/deplete cash on its own; only actually playing
// a new day (careerEngine.nextDay(), or a financial decision applied
// through this hook) does.
//
// Every action resolves the session itself (resolveSession(), see
// useCareer.js's docstring) before financeRepository branches Supabase
// vs guest, so a mount-time load can't race ahead of the guest fallback.
export function useFinance() {
  const { reload: resolveSession } = useSupabaseSession();
  const career = useCareerContext();

  const [financeState, setFinanceState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useFinance]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Loads the persisted FinanceState, and recomputes a fresh cycle only
  // if Career has played a day since the last one was recorded (compares
  // the CareerState's own `day` against the stored cyclesElapsed).
  //
  // Never computes (or persists) anything before a real hotel bundle
  // exists: without this guard, the mount-time call every Finance page
  // makes (before the player has necessarily started a career yet) would
  // compute and save an all-zero cycle from an empty bundle, permanently
  // stuck at cyclesElapsed: 1 -- once a real career starts at day 0, `0 >
  // 1` is false, so that all-zero cycle would never get replaced.
  const loadFinanceState = useCallback(
    (explicitCareerState) =>
      runWithErrorHandling(async () => {
        await resolveSession();
        const currentCareerState = explicitCareerState || career.careerState || (await career.loadCareerState().catch(() => null));
        const hotelBundle = currentCareerState?.hotel;
        if (!hotelBundle) {
          setFinanceState(null);
          return null;
        }

        const stored = await financeRepository.getFinanceState();
        const careerDay = currentCareerState?.day ?? 0;
        const needsNewCycle = !stored || careerDay > (stored.cyclesElapsed ?? 0);
        const nextState = needsNewCycle
          ? runFinanceCycle({ hotelBundle, previousState: stored })
          : stored;

        setFinanceState(nextState);
        if (needsNewCycle) {
          await financeRepository.saveFinanceState(nextState);
          await financeRepository.appendFinanceReport(nextState);
          await financeRepository.saveFinanceForecast(nextState.forecast);
        }
        return nextState;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [career, resolveSession, runWithErrorHandling]
  );

  // Applies a financial decision (see lib/finance/financeEngine.js's
  // FINANCE_ACTION_CATALOG) to the player's own hotel bundle through
  // useCareer.js's applyHotelAdjustment() -- the same mechanism
  // Dashboard.jsx's Quick Actions already use -- then recomputes the
  // finance cycle from the outcome it returns (not from
  // career.careerState, which won't reflect the update until the next
  // render; see useDashboard.js's applyQuickAction() docstring).
  const applyFinancialDecision = useCallback(
    (actionId, payload = {}) =>
      runWithErrorHandling(async () => {
        const updatedCareerState = await career.applyHotelAdjustment((hotelBundle) => applyFinancialDecisionPure(hotelBundle, actionId, payload));
        const nextState = runFinanceCycle({ hotelBundle: updatedCareerState.hotel, previousState: financeState });
        setFinanceState(nextState);
        await financeRepository.saveFinanceState(nextState);
        await financeRepository.appendFinanceReport(nextState);
        return nextState;
      }),
    [career, financeState, runWithErrorHandling]
  );

  const getFinancialReport = useCallback(() => generateFinancialReport(financeState), [financeState]);
  const getFinancialDiagnostics = useCallback(() => financeState?.diagnostics || [], [financeState]);
  const getFinancialForecast = useCallback(() => financeState?.forecast || null, [financeState]);

  return {
    financeState,
    isRunning,
    error,
    loadFinanceState,
    getFinancialReport,
    getFinancialDiagnostics,
    getFinancialForecast,
    applyFinancialDecision,
  };
}
