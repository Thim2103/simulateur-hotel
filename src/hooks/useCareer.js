import { useCallback, useState } from "react";
import {
  acceptMission as acceptMissionEngine,
  claimReward as claimRewardEngine,
  completeMission as completeMissionEngine,
  runCareerDay,
  startCareer as startCareerEngine,
  triggerStoryEvent as triggerStoryEventEngine,
  updateSkillPoints,
} from "../lib/career/careerEngine";
import careerRepository from "../lib/career/careerRepository";
import { buildReplayRunFromCareerRun } from "../lib/replay/replayEngine";
import { analyzeRun } from "../lib/analytics/analyticsEngine";
import { getHotelState } from "../lib/hotelRepository";
import { getRestaurantState } from "../lib/restaurantRepository";
import { listRooms, listReservations } from "../lib/pmsRepository";
import { useSupabaseSession } from "./useSupabaseSession";
import { createGuestHotelBundle, createGuestRepository } from "../lib/guest";

// One localStorage slot for the whole career -- stateless factory, safe
// to build once at module scope (see lib/guest/guestAdapter.js).
const guestCareerRepository = createGuestRepository("career", { defaultState: null });

// Drives the Solo/Career mode: the player's own hotel, run day by day
// through runDailyCycle() (sandboxed, see lib/career/careerEngine.js's
// runCareerDay()), with missions/objectives/storyline/skills/rewards
// layered on top and synced with the existing progressionEngine (already
// run inside runDailyCycle). Every day is also recorded into a replay log
// (see lib/replay/) and analyzed (see lib/analytics/) so
// CareerDashboard.jsx can show real insights, not placeholders.
//
// In guest mode (see hooks/useSupabaseSession.js -- no Supabase session,
// no anonymous auth available) this bypasses careerRepository.js and the
// hotel/restaurant/PMS repositories entirely: the starting hotel comes
// from a locally-seeded bundle (lib/guest/guestAdapter.js's
// createGuestHotelBundle(), ready to play immediately) and every save
// goes to localStorage instead of Supabase. runCareerDay() already runs
// runDailyCycle() sandboxed (persist: false) regardless of mode, so guest
// mode needed no changes there. A real Supabase session keeps the
// existing behaviour unchanged; a load/save failure there still surfaces
// as `error` rather than silently reverting to demo data.
//
// Every action below starts by `await`ing resolveSession() instead of
// reading the `isGuest` closed over at render time: useSupabaseSession()
// resolves asynchronously (it tries real Supabase auth first, then falls
// back to a guest session), and a mount-time effect calling e.g.
// loadCareerState() can easily run before that first resolution
// completes -- reading a still-`undefined`/stale session would wrongly
// take the Supabase branch and surface a "non authentifiee" error even
// though this is (or is about to become) a guest session.
// resolveSession() itself is cheap to call repeatedly: ensureAuthSession()
// caches its own promise (see lib/supabase.js), so this never re-triggers
// a real network call once the first resolution has happened.
export function useCareer() {
  const { session, reload: resolveSession } = useSupabaseSession();
  const isGuest = session?.mode === "guest";

  const [careerState, setCareerState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const runWithErrorHandling = useCallback(async (fn) => {
    setIsRunning(true);
    setError(null);
    try {
      return await fn();
    } catch (runError) {
      console.error("[useCareer]", runError);
      setError(runError);
      throw runError;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const persistCareerState = useCallback(
    (state, guestNow) => (guestNow ? guestCareerRepository.save(state) : careerRepository.saveCareerState(state)),
    []
  );

  // Starts a brand-new career against the player's real (persisted) hotel
  // -- the same hotel runDailyCycle()/chainEngine already know about -- or,
  // in guest mode, a freshly-seeded local one (no hotel to load yet).
  const startCareer = useCallback(
    (playerId) =>
      runWithErrorHandling(async () => {
        const guestNow = (await resolveSession())?.mode === "guest";
        const bundle = guestNow
          ? createGuestHotelBundle()
          : await Promise.all([getHotelState(), getRestaurantState(), listRooms(), listReservations()]).then(
              ([hotelState, restaurantState, rooms, reservations]) => ({ hotelState, restaurantState, rooms, reservations })
            );
        const state = startCareerEngine({ playerId, ...bundle });
        setCareerState(state);
        await persistCareerState(state, guestNow);
        return state;
      }),
    [persistCareerState, resolveSession, runWithErrorHandling]
  );

  const loadCareerState = useCallback(
    () =>
      runWithErrorHandling(async () => {
        const guestNow = (await resolveSession())?.mode === "guest";
        const state = guestNow ? await guestCareerRepository.get() : await careerRepository.loadCareerState();
        setCareerState(state);
        return state;
      }),
    [resolveSession, runWithErrorHandling]
  );

  const acceptMission = useCallback(
    (missionId) =>
      runWithErrorHandling(async () => {
        const guestNow = (await resolveSession())?.mode === "guest";
        const nextState = acceptMissionEngine(careerState, missionId);
        setCareerState(nextState);
        await persistCareerState(nextState, guestNow);
        return nextState;
      }),
    [careerState, persistCareerState, resolveSession, runWithErrorHandling]
  );

  const completeMission = useCallback(
    (missionId) =>
      runWithErrorHandling(async () => {
        const guestNow = (await resolveSession())?.mode === "guest";
        const { state: nextState } = completeMissionEngine(careerState, missionId);
        setCareerState(nextState);
        await persistCareerState(nextState, guestNow);
        return nextState;
      }),
    [careerState, persistCareerState, resolveSession, runWithErrorHandling]
  );

  const triggerStoryEvent = useCallback(
    (eventId, choiceId) =>
      runWithErrorHandling(async () => {
        const guestNow = (await resolveSession())?.mode === "guest";
        const { state: nextState, consequence } = triggerStoryEventEngine(careerState, eventId, choiceId);
        setCareerState(nextState);
        await persistCareerState(nextState, guestNow);
        return consequence;
      }),
    [careerState, persistCareerState, resolveSession, runWithErrorHandling]
  );

  const updateSkill = useCallback(
    (skillId, delta) =>
      runWithErrorHandling(async () => {
        const guestNow = (await resolveSession())?.mode === "guest";
        const nextState = updateSkillPoints(careerState, skillId, delta);
        setCareerState(nextState);
        await persistCareerState(nextState, guestNow);
        return nextState;
      }),
    [careerState, persistCareerState, resolveSession, runWithErrorHandling]
  );

  const claimReward = useCallback(
    (rewardId) =>
      runWithErrorHandling(async () => {
        const guestNow = (await resolveSession())?.mode === "guest";
        const { state: nextState } = claimRewardEngine(careerState, rewardId);
        setCareerState(nextState);
        await persistCareerState(nextState, guestNow);
        return nextState;
      }),
    [careerState, persistCareerState, resolveSession, runWithErrorHandling]
  );

  // Applies a pure transform to the player's own hotel bundle (the
  // { hotelState, restaurantState, rooms, reservations } shape careerState
  // .hotel carries) and persists the result -- what Dashboard.jsx's Quick
  // Actions (see lib/dashboard/dashboardActions.js's applyQuickAction())
  // use to actually take effect, without useCareer.js needing to know
  // anything about the Dashboard module itself: the caller supplies a
  // plain (hotelBundle) => nextHotelBundle function.
  const applyHotelAdjustment = useCallback(
    (updater) =>
      runWithErrorHandling(async () => {
        const guestNow = (await resolveSession())?.mode === "guest";
        const nextHotel = updater(careerState.hotel);
        const nextState = { ...careerState, hotel: nextHotel };
        setCareerState(nextState);
        await persistCareerState(nextState, guestNow);
        return nextState;
      }),
    [careerState, persistCareerState, resolveSession, runWithErrorHandling]
  );

  // Plays one sandboxed day, then analyzes it (see lib/analytics/
  // analyticsEngine.js) so CareerDashboard.jsx has real diagnostics/
  // recommendations to show, not a placeholder. runCareerDay() itself is
  // already fully sandboxed (persist: false) in every mode.
  const nextDay = useCallback(
    (decisions = {}) =>
      runWithErrorHandling(async () => {
        const guestNow = (await resolveSession())?.mode === "guest";
        const { state: nextState, report } = await runCareerDay({ state: careerState, decisions });

        const replayRun = buildReplayRunFromCareerRun({
          playerId: nextState.playerId,
          replayLog: nextState.replayLog,
          scoreHistory: nextState.scoreHistory,
          status: nextState.status,
          day: nextState.day,
        });
        const lastAnalysis = analyzeRun(replayRun);

        const stateWithAnalysis = { ...nextState, lastAnalysis };
        setCareerState(stateWithAnalysis);
        await persistCareerState(stateWithAnalysis, guestNow);
        return { state: stateWithAnalysis, report, analysis: lastAnalysis };
      }),
    [careerState, persistCareerState, resolveSession, runWithErrorHandling]
  );

  return {
    careerState,
    isRunning,
    error,
    isGuest,
    startCareer,
    loadCareerState,
    acceptMission,
    completeMission,
    triggerStoryEvent,
    updateSkill,
    claimReward,
    applyHotelAdjustment,
    nextDay,
  };
}
