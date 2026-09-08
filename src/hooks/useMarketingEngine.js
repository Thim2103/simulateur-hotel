import { useCallback, useState } from "react";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import { applyMarketingDecision as applyMarketingDecisionPure, generateMarketingReport, runMarketingCycle } from "../lib/marketing/marketingEngine";
import { staffFromCareerState } from "../lib/staff/staffEngine";
import marketingRepository from "../lib/marketingRepository";

// Drives the Marketing module: reads the player's own hotel bundle (and
// latest DailyReport) from CareerState (see context/CareerContext.jsx --
// the same instance hooks/useFinance.js/useStaffEngine.js already read)
// and layers the budget/ROI/conversion/segments/reputation/positioning/
// diagnostics/forecast lib/marketing/marketingEngine.js computes on top
// of it.
//
// A marketing cycle only advances when Career's own day counter has
// moved since the last one was computed -- reopening the Marketing
// pages doesn't silently recompute figures on its own; only actually
// playing a new day (careerEngine.nextDay(), or a marketing action
// applied through this hook) does. Same "day-counter sync" pattern as
// hooks/useFinance.js/useStaffEngine.js.
//
// Every action resolves the session itself (resolveSession()) before
// marketingRepository branches Supabase vs guest, so a mount-time load
// can't race ahead of the guest fallback.
export function useMarketingEngine() {
  const { reload: resolveSession } = useSupabaseSession();
  const career = useCareerContext();

  const [marketingState, setMarketingState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useMarketingEngine]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Loads the persisted MarketingState, and recomputes a fresh cycle
  // only if Career has played a day since the last one was recorded.
  //
  // Never computes (or persists) anything before a real hotel bundle
  // exists: this is the same "self-poisoning persistence" bug hooks/
  // useFinance.js's loadFinanceState() hit and fixed -- without this
  // guard, the mount-time call every Marketing page makes (before the
  // player has necessarily started a career yet) would compute and save
  // an all-zero cycle from an empty bundle, permanently stuck at
  // cyclesElapsed: 1.
  const loadMarketingState = useCallback(
    (explicitCareerState) =>
      runWithErrorHandling(async () => {
        await resolveSession();
        const currentCareerState = explicitCareerState || career.careerState || (await career.loadCareerState().catch(() => null));
        const hotelBundle = currentCareerState?.hotel;
        if (!hotelBundle) {
          setMarketingState(null);
          return null;
        }

        const stored = await marketingRepository.getMarketingState();
        const careerDay = currentCareerState?.day ?? 0;
        const needsNewCycle = !stored || careerDay > (stored.cyclesElapsed ?? 0);
        const staff = needsNewCycle ? staffFromCareerState(currentCareerState) : null;
        const nextState = needsNewCycle
          ? runMarketingCycle({
              hotelBundle,
              baseReputation: currentCareerState?.lastDayReport?.progressionReport?.reputation ?? null,
              staffOverload: staff?.overload ?? null,
              previousState: stored,
            })
          : stored;

        setMarketingState(nextState);
        if (needsNewCycle) {
          await marketingRepository.saveMarketingState(nextState);
          await marketingRepository.saveMarketingCampaigns(nextState.campaigns);
          await marketingRepository.saveMarketingChannels(nextState.channels);
          await marketingRepository.saveMarketingForecast(nextState.forecast);
        }
        return nextState;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [career, resolveSession, runWithErrorHandling]
  );

  // Applies a marketing action (see lib/marketing/marketingEngine.js's
  // MARKETING_ACTION_CATALOG) to the player's own hotel bundle through
  // useCareer.js's applyHotelAdjustment() -- the same mechanism Finance/
  // Staff already use -- then recomputes the marketing cycle from the
  // outcome it returns (not from career.careerState, which won't
  // reflect the update until the next render).
  const applyMarketingAction = useCallback(
    (actionId, payload = {}) =>
      runWithErrorHandling(async () => {
        const updatedCareerState = await career.applyHotelAdjustment((hotelBundle) => applyMarketingDecisionPure(hotelBundle, actionId, payload));
        const staff = staffFromCareerState(updatedCareerState);
        const nextState = runMarketingCycle({
          hotelBundle: updatedCareerState.hotel,
          baseReputation: updatedCareerState?.lastDayReport?.progressionReport?.reputation ?? null,
          staffOverload: staff?.overload ?? null,
          previousState: marketingState,
        });
        setMarketingState(nextState);
        await marketingRepository.saveMarketingState(nextState);
        await marketingRepository.saveMarketingCampaigns(nextState.campaigns);
        await marketingRepository.saveMarketingChannels(nextState.channels);
        await marketingRepository.saveMarketingForecast(nextState.forecast);
        return nextState;
      }),
    [career, marketingState, runWithErrorHandling]
  );

  const getMarketingDiagnostics = useCallback(() => marketingState?.diagnostics || [], [marketingState]);
  const getMarketingForecast = useCallback(() => marketingState?.forecast || null, [marketingState]);
  const getCampaigns = useCallback(() => marketingState?.campaigns || [], [marketingState]);
  const getChannels = useCallback(() => marketingState?.channels || [], [marketingState]);
  const getMarketingReport = useCallback(() => generateMarketingReport(marketingState), [marketingState]);

  return {
    marketingState,
    isRunning,
    error,
    loadMarketingState,
    getMarketingDiagnostics,
    getMarketingForecast,
    getCampaigns,
    getChannels,
    getMarketingReport,
    applyMarketingAction,
  };
}

export default useMarketingEngine;
