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

// Drives the Solo/Career mode: the player's own hotel, run day by day
// through runDailyCycle() (sandboxed, see lib/career/careerEngine.js's
// runCareerDay()), with missions/objectives/storyline/skills/rewards
// layered on top and synced with the existing progressionEngine (already
// run inside runDailyCycle). Every day is also recorded into a replay log
// (see lib/replay/) and analyzed (see lib/analytics/) so
// CareerDashboard.jsx can show real insights, not placeholders. State is
// mirrored to Supabase via careerRepository.js; a load/save failure
// surfaces as `error` rather than silently reverting to demo data.
export function useCareer() {
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

  // Starts a brand-new career against the player's real (persisted) hotel
  // -- the same hotel runDailyCycle()/chainEngine already know about.
  const startCareer = useCallback(
    (playerId) =>
      runWithErrorHandling(async () => {
        const [hotelState, restaurantState, rooms, reservations] = await Promise.all([
          getHotelState(),
          getRestaurantState(),
          listRooms(),
          listReservations(),
        ]);
        const state = startCareerEngine({ playerId, hotelState, restaurantState, rooms, reservations });
        setCareerState(state);
        await careerRepository.saveCareerState(state);
        return state;
      }),
    [runWithErrorHandling]
  );

  const loadCareerState = useCallback(
    () =>
      runWithErrorHandling(async () => {
        const state = await careerRepository.loadCareerState();
        setCareerState(state);
        return state;
      }),
    [runWithErrorHandling]
  );

  const acceptMission = useCallback(
    (missionId) =>
      runWithErrorHandling(async () => {
        const nextState = acceptMissionEngine(careerState, missionId);
        setCareerState(nextState);
        await careerRepository.saveCareerState(nextState);
        return nextState;
      }),
    [careerState, runWithErrorHandling]
  );

  const completeMission = useCallback(
    (missionId) =>
      runWithErrorHandling(async () => {
        const { state: nextState } = completeMissionEngine(careerState, missionId);
        setCareerState(nextState);
        await careerRepository.saveCareerState(nextState);
        return nextState;
      }),
    [careerState, runWithErrorHandling]
  );

  const triggerStoryEvent = useCallback(
    (eventId, choiceId) =>
      runWithErrorHandling(async () => {
        const { state: nextState, consequence } = triggerStoryEventEngine(careerState, eventId, choiceId);
        setCareerState(nextState);
        await careerRepository.saveCareerState(nextState);
        return consequence;
      }),
    [careerState, runWithErrorHandling]
  );

  const updateSkill = useCallback(
    (skillId, delta) =>
      runWithErrorHandling(async () => {
        const nextState = updateSkillPoints(careerState, skillId, delta);
        setCareerState(nextState);
        await careerRepository.saveCareerState(nextState);
        return nextState;
      }),
    [careerState, runWithErrorHandling]
  );

  const claimReward = useCallback(
    (rewardId) =>
      runWithErrorHandling(async () => {
        const { state: nextState } = claimRewardEngine(careerState, rewardId);
        setCareerState(nextState);
        await careerRepository.saveCareerState(nextState);
        return nextState;
      }),
    [careerState, runWithErrorHandling]
  );

  // Plays one sandboxed day, then analyzes it (see lib/analytics/
  // analyticsEngine.js) so CareerDashboard.jsx has real diagnostics/
  // recommendations to show, not a placeholder.
  const nextDay = useCallback(
    (decisions = {}) =>
      runWithErrorHandling(async () => {
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
        await careerRepository.saveCareerState(stateWithAnalysis);
        return { state: stateWithAnalysis, report, analysis: lastAnalysis };
      }),
    [careerState, runWithErrorHandling]
  );

  return {
    careerState,
    isRunning,
    error,
    startCareer,
    loadCareerState,
    acceptMission,
    completeMission,
    triggerStoryEvent,
    updateSkill,
    claimReward,
    nextDay,
  };
}
