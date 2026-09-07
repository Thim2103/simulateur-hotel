// Shape helpers for the Solo/Career state: the player's hotel bundle (the
// same shape runDailyCycle() and chainEngine already use), their accepted
// missions/objectives/storyline/skills/rewards, and the running replay
// log for the whole career (see lib/replay/replayEngine.js's
// buildReplayRunFromCareerRun()).
import { safeArray, safeObject } from "../safe";
import { defaultHotelState } from "../hotel";
import { createInitialRestaurantState } from "../restaurant/restaurantState";
import { createReplayLog } from "../scenario/scenarioReplay";

export function createCareerState(overrides = {}) {
  const source = safeObject(overrides);
  return {
    playerId: source.playerId || null,
    status: source.status || "not_started",
    day: source.day || 0,
    hotel: {
      hotelState: source.hotel?.hotelState || defaultHotelState,
      restaurantState: source.hotel?.restaurantState || createInitialRestaurantState(),
      rooms: safeArray(source.hotel?.rooms),
      reservations: safeArray(source.hotel?.reservations),
    },
    missions: safeArray(source.missions),
    objectives: safeArray(source.objectives),
    storyline: { currentEventId: null, history: [], ...safeObject(source.storyline) },
    skills: safeObject(source.skills),
    rewardsInbox: safeArray(source.rewardsInbox),
    claimedRewardIds: safeArray(source.claimedRewardIds),
    activeMiniScenario: source.activeMiniScenario || null,
    replayLog: source.replayLog || createReplayLog(),
    scoreHistory: safeArray(source.scoreHistory),
    lastDayReport: source.lastDayReport || null,
    lastAnalysis: source.lastAnalysis || null,
  };
}

export function findMission(state, missionId) {
  return safeArray(state?.missions).find((mission) => mission.id === missionId) || null;
}

export function findObjective(state, objectiveId) {
  return safeArray(state?.objectives).find((objective) => objective.id === objectiveId) || null;
}

export function findReward(state, rewardId) {
  return safeArray(state?.rewardsInbox).find((reward) => reward.id === rewardId) || null;
}

// The activeMiniScenario (see careerEngine.js's runMiniScenarioChallenge())
// carries a ScenarioRunState, which has a `triggeredEventIds` Set --
// JSON.stringify silently drops it, so persistence needs this boundary,
// same as lib/academy/academyState.js's serializeRunState().
export function serializeCareerState(state) {
  if (!state?.activeMiniScenario) return state;
  return { ...state, activeMiniScenario: { ...state.activeMiniScenario, triggeredEventIds: Array.from(state.activeMiniScenario.triggeredEventIds || []) } };
}

export function deserializeCareerState(stored) {
  if (!stored?.activeMiniScenario) return stored;
  return { ...stored, activeMiniScenario: { ...stored.activeMiniScenario, triggeredEventIds: new Set(safeArray(stored.activeMiniScenario.triggeredEventIds)) } };
}
