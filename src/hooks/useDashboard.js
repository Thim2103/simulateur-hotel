import { useCallback, useState } from "react";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import { buildDashboardState } from "../lib/dashboard/dashboardEngine";
import { applyQuickAction as applyQuickActionEngine } from "../lib/dashboard/dashboardActions";
import dashboardRepository from "../lib/dashboard/dashboardRepository";
import { DEFAULT_VIEW_MODE, normalizeViewMode } from "../lib/dashboard/dashboardViewMode";
import { createGuestRepository } from "../lib/guest";

// One localStorage slot for the Dashboard's own preferences (view mode),
// same pattern as useCareer.js's guestCareerRepository.
const guestDashboardRepository = createGuestRepository("dashboard", { defaultState: null });

// Drives the general Dashboard ("Mon Hôtel"): reads the player's own
// CareerState (see context/CareerContext.jsx -- the same instance
// CareerDashboard.jsx and friends share) and reshapes it into everything
// Dashboard.jsx needs (see lib/dashboard/dashboardEngine.js's
// buildDashboardState()) -- KPIs, notifications, insights, quick actions,
// yesterday's replay summary, career progression. The Dashboard doesn't
// own any hotel/restaurant/career data itself; the only thing it persists
// is the view-mode preference (casual/expert), through
// lib/dashboard/dashboardRepository.js or, in guest mode (see
// hooks/useSupabaseSession.js), localStorage via lib/guest/.
export function useDashboard() {
  const { session, reload: resolveSession } = useSupabaseSession();
  const isGuest = session?.mode === "guest";
  const career = useCareerContext();

  const [dashboardState, setDashboardState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useDashboard]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const persistPreferences = useCallback(
    (state, guestNow) =>
      guestNow
        ? guestDashboardRepository.save({ viewMode: state.viewMode, metadata: state.metadata })
        : dashboardRepository.saveDashboardPreferences(state),
    []
  );

  // Loads the stored view-mode preference and rebuilds the full
  // DashboardState from the player's CareerState. If Career hasn't been
  // loaded yet by another page (e.g. Dashboard.jsx is the first page
  // visited), this loads it too, so a fresh session doesn't need a detour
  // through /career first.
  //
  // Accepts an optional explicit CareerState (e.g. the one nextDay() just
  // returned) instead of reading career.careerState -- calling this right
  // after another async Career action, in the same handler, would
  // otherwise read a stale value: setCareerState() inside useCareer.js
  // schedules a re-render, but doesn't synchronously update the `career`
  // object this hook already closed over before that re-render happens.
  //
  // Resolves the session itself (resolveSession(), see useCareer.js's
  // docstring for why) rather than trusting the `isGuest` closed over at
  // render time -- this is typically the very first thing to run after
  // mount, exactly when that race is most likely to bite.
  const loadDashboardState = useCallback(
    (explicitCareerState) =>
      runWithErrorHandling(async () => {
        const guestNow = (await resolveSession())?.mode === "guest";
        const currentCareerState = explicitCareerState || career.careerState || (await career.loadCareerState().catch(() => null));
        const stored = guestNow ? await guestDashboardRepository.get() : await dashboardRepository.loadDashboardPreferences();
        const viewMode = normalizeViewMode(stored?.viewMode || DEFAULT_VIEW_MODE);
        const nextState = buildDashboardState({ careerState: currentCareerState, viewMode });
        setDashboardState(nextState);
        return nextState;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [career, resolveSession, runWithErrorHandling]
  );

  const setViewMode = useCallback(
    (mode) =>
      runWithErrorHandling(async () => {
        const guestNow = (await resolveSession())?.mode === "guest";
        const nextState = buildDashboardState({ careerState: career.careerState, viewMode: mode });
        setDashboardState(nextState);
        await persistPreferences(nextState, guestNow);
        return nextState;
      }),
    [career.careerState, persistPreferences, resolveSession, runWithErrorHandling]
  );

  // Runs a quick action against the player's own hotel bundle (see
  // lib/dashboard/dashboardActions.js) through useCareer.js's
  // applyHotelAdjustment() -- which stores and persists the result -- then
  // rebuilds the DashboardState from the outcome it returns (not from
  // career.careerState, which won't reflect the update until the next
  // render).
  const applyQuickAction = useCallback(
    (actionId, payload = {}) =>
      runWithErrorHandling(async () => {
        const updatedCareerState = await career.applyHotelAdjustment((hotelBundle) => applyQuickActionEngine(hotelBundle, actionId, payload));
        const nextState = buildDashboardState({ careerState: updatedCareerState, viewMode: dashboardState?.viewMode });
        setDashboardState(nextState);
        return nextState;
      }),
    [career, dashboardState, runWithErrorHandling]
  );

  const getNotifications = useCallback(
    () => dashboardState?.notifications || { problems: [], alerts: [], opportunities: [] },
    [dashboardState]
  );
  const getInsights = useCallback(() => dashboardState?.insights || null, [dashboardState]);
  const getQuickActions = useCallback(() => dashboardState?.quickActions || [], [dashboardState]);

  return {
    dashboardState,
    isRunning,
    error,
    isGuest,
    loadDashboardState,
    getNotifications,
    getInsights,
    getQuickActions,
    setViewMode,
    applyQuickAction,
  };
}
