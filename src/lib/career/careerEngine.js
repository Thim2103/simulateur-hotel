// Orchestrates the Solo/Career mode: runs the player's real hotel through
// runDailyCycle() (sandboxed -- persist: false, the caller/hook decides
// whether and how to persist career state), then layers missions,
// objectives, storyline and skill bonuses on top, and records the day
// into a replay log the Replay Engine can read back (see
// lib/replay/replayEngine.js's buildReplayRunFromCareerRun()).
import { safeArray, safeNumber } from "../safe";
import { runDailyCycle } from "../dailyCycle/runDailyCycle";
import { initScenarioRun, playScenarioCycle } from "../scenario/scenarioEngine";
import { recordCycle } from "../scenario/scenarioReplay";
import { createCareerState, findMission } from "./careerState";
import { acceptMission as acceptMissionPure, completeMission as completeMissionPure, evaluateMissions, missionsJustCompleted, seedMissions } from "./careerMissions";
import { evaluateCareerObjectives, newlyAchieved, seedObjectives } from "./careerObjectives";
import { findNextEligibleEvent } from "./careerEvents";
import { applyConsequenceToHotel, resolveStoryChoice, setCurrentEvent } from "./careerStoryline";
import { computeSkillBonuses, updateSkill } from "./careerSkills";
import { applyCashRewardToHotel, claimReward as claimRewardPure, grantReward } from "./careerRewards";
import { progressionSnapshot } from "./careerProgression";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// 1. Starts a new career: seeds the default missions/objectives against
// whichever hotel bundle the caller provides (or bare defaults).
export function startCareer({ playerId, hotelState, restaurantState, rooms, reservations } = {}) {
  return {
    ...createCareerState({ playerId, hotel: { hotelState, restaurantState, rooms, reservations } }),
    status: "active",
    missions: seedMissions(),
    objectives: seedObjectives(),
  };
}

export function acceptMission(state, missionId) {
  return { ...state, missions: acceptMissionPure(state.missions, missionId, state.day) };
}

// For a mission not auto-checked (a story/mini-scenario mission, see
// careerMissions.MISSION_CATALOG's `auto: false` entries).
export function completeMission(state, missionId) {
  const mission = findMission(state, missionId);
  const missions = completeMissionPure(state.missions, missionId, state.day);
  if (!mission || mission.status !== "accepted") return { state: { ...state, missions } };
  const rewardsInbox = mission.rewardId ? grantReward(state.rewardsInbox, mission.rewardId, mission.title) : state.rewardsInbox;
  return { state: { ...state, missions, rewardsInbox } };
}

// 6. A story event's choice: applies the consequence (cash to the hotel,
// skill points, or a reputation nudge folded into the next day's summary)
// and records it in the storyline's history.
export function triggerStoryEvent(state, eventId, choiceId) {
  const { storyline, consequence } = resolveStoryChoice(state.storyline, eventId, choiceId, state.day);
  if (!consequence) return { state, consequence: null };

  const hotelState = applyConsequenceToHotel(state.hotel.hotelState, consequence);
  const skills = consequence.skillId ? updateSkill(state.skills, consequence.skillId, consequence.skillPoints) : state.skills;

  return {
    state: { ...state, storyline, skills, hotel: { ...state.hotel, hotelState } },
    consequence,
  };
}

export function updateSkillPoints(state, skillId, delta) {
  return { ...state, skills: updateSkill(state.skills, skillId, delta) };
}

// Removes a reward from the inbox and applies its effect (cash to the
// hotel, or skill points) -- see careerRewards.js.
export function claimReward(state, rewardEntryId) {
  const { rewardsInbox, effect } = claimRewardPure(state.rewardsInbox, rewardEntryId);
  if (!effect) return { state, effect: null };
  const hotelState = effect.cashDelta ? applyCashRewardToHotel(state.hotel.hotelState, effect.cashDelta) : state.hotel.hotelState;
  const skills = effect.skillId ? updateSkill(state.skills, effect.skillId, effect.skillPoints) : state.skills;
  return { state: { ...state, rewardsInbox, skills, hotel: { ...state.hotel, hotelState } }, effect };
}

// 6 (section 6 of the request). A bounded, sandboxed mini-scenario
// challenge -- the "mini-cas pratique" a mission like
// careerMissions.MISSION_CATALOG's "mini-scenario-pricing" resolves
// through, using the full Scenario Engine (constraints, scoring,
// objectives) for exactly one cycle rather than career's own lighter
// mission/objective checks.
export async function runMiniScenarioChallenge({ state, scenario, decisions = {}, referenceDate = new Date(), rng = Math.random }) {
  const run = state.activeMiniScenario || initScenarioRun({ scenario, hotelState: state.hotel.hotelState, restaurantState: state.hotel.restaurantState });
  const { report, runState } = await playScenarioCycle({ runState: run, decisions, referenceDate, rng });
  const nextState = { ...state, activeMiniScenario: runState.status === "finished" ? null : runState };
  return { state: nextState, report };
}

// 5. The full daily loop: sandboxed runDailyCycle(), then missions,
// objectives, storyline eligibility, skill-adjusted summary, and the
// day's replay entry.
export async function runCareerDay({ state, decisions = {}, referenceDate = new Date(), rng = Math.random } = {}) {
  const dailyReport = await runDailyCycle({
    hotelState: state.hotel.hotelState,
    restaurantState: state.hotel.restaurantState,
    rooms: state.hotel.rooms,
    reservations: state.hotel.reservations,
    referenceDate,
    rng,
    persist: false,
  });

  const day = state.day + 1;

  const missionsAfterEval = evaluateMissions(state.missions, dailyReport, day);
  const objectivesAfterEval = evaluateCareerObjectives(state.objectives, dailyReport);
  const completedMissions = missionsJustCompleted(state.missions, missionsAfterEval);
  const achievedObjectives = newlyAchieved(state.objectives, objectivesAfterEval);

  let rewardsInbox = state.rewardsInbox;
  completedMissions.forEach((mission) => {
    if (mission.rewardId) rewardsInbox = grantReward(rewardsInbox, mission.rewardId, mission.title);
  });

  const progression = progressionSnapshot(dailyReport);
  const eligibleEvent = findNextEligibleEvent(
    { day, level: progression.level, triggeredEventIds: state.storyline.history.map((entry) => entry.eventId) },
    undefined
  );
  const storyline = eligibleEvent && !state.storyline.currentEventId ? setCurrentEvent(state.storyline, eligibleEvent.id) : state.storyline;

  const bonuses = computeSkillBonuses(state.skills);
  const adjustedProfit = Math.round(safeNumber(dailyReport.profit, 0) * bonuses.profitMultiplier);
  const dayScore = Math.round(clamp(50 + adjustedProfit / 100 + completedMissions.length * 10 + achievedObjectives.length * 5, 0, 100));

  const replayLog = recordCycle(state.replayLog, {
    cycleIndex: state.day,
    baseReport: dailyReport,
    scenarioEvents: safeArray(dailyReport.events),
    objectivesStatus: { objectives: objectivesAfterEval },
    score: dayScore,
    decisions,
  });

  const nextState = {
    ...state,
    day,
    hotel: {
      ...state.hotel,
      hotelState: dailyReport.nextState.hotelState,
      restaurantState: dailyReport.nextState.restaurantState,
      rooms: dailyReport.nextState.rooms,
      reservations: dailyReport.nextState.reservations,
    },
    missions: missionsAfterEval,
    objectives: objectivesAfterEval,
    storyline,
    rewardsInbox,
    replayLog,
    scoreHistory: [...state.scoreHistory, dayScore],
    lastDayReport: dailyReport,
  };

  return {
    state: nextState,
    report: { dailyReport, progression, adjustedProfit, dayScore, completedMissions, achievedObjectives, newStoryEvent: eligibleEvent && !state.storyline.currentEventId ? eligibleEvent : null },
  };
}

export const careerEngine = {
  startCareer,
  acceptMission,
  completeMission,
  triggerStoryEvent,
  updateSkillPoints,
  claimReward,
  runMiniScenarioChallenge,
  runCareerDay,
};
export default careerEngine;
