// Orchestrates the player progression pipeline: reputation -> xp -> level
// -> objectives -> achievements -> rewards -> storyline -> progressionReport.
// Every step is a small pure function in this folder; this file only wires
// them together (see lib/dailyCycle/runDailyCycle.js for how it's called
// once a day).
import { calculateReputation } from "./reputation";
import { determineLevel } from "./levels";
import { checkObjectives } from "./objectives";
import { checkAchievements } from "./achievements";
import { generateRewards } from "./rewards";
import { generateStorylineEvents } from "./storyline";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

const DEFAULT_PLAYER_STATE = {
  xp: 0,
  level: 1,
  reputation: null,
  unlockedAchievements: [],
};

// Today's XP gain: a baseline for playing the day, a bonus scaled with
// profit, and a penalty for severe events (see lib/events/).
function calculateXpGain({ dailyReport = {} } = {}) {
  const profit = Number(dailyReport.profit || 0);
  const baseline = 10;
  const profitBonus = profit > 0 ? Math.min(50, Math.round(profit / 100)) : 0;
  const severeEventPenalty = safeArray(dailyReport.events).filter((event) => event.severity === "high").length * 5;
  return Math.max(1, baseline + profitBonus - severeEventPenalty);
}

// hotelState/restaurantState: the day's (already-updated) state -- see
// runDailyCycle.js, which runs this after every other step so it can see
// the day's full results. dailyReport: { hotelRevenue, restaurantRevenue,
// expenses, profit, events, staffChanges, reservationsChanges, rmReport }.
// rooms: the PMS rooms, for occupancy-based objectives.
//
// Returns { report, player }: `report` is the progressionReport contract;
// `player` is the fuller running state (xp/level/reputation/unlocked
// achievements) the caller should persist for tomorrow (e.g. in
// hotelState.progression.player -- see reputation.js's docstring on why
// that's safe without a migration).
export function runProgression({ hotelState = {}, restaurantState = {}, rooms = [], dailyReport = {} } = {}) {
  const player = { ...DEFAULT_PLAYER_STATE, ...(hotelState.progression?.player || {}) };
  const cycles = Number(hotelState.progression?.cycles || 0) + 1;

  // 1. Reputation
  const reputation = calculateReputation({
    hotelState,
    restaurantState,
    events: dailyReport.events,
    previousReputation: player.reputation,
  });

  // 2. XP
  const xp = player.xp + calculateXpGain({ dailyReport });

  // 3. Level
  const levelInfo = determineLevel(xp);

  // 4. Objectives completed today
  const objectivesCompleted = checkObjectives({ hotelState, restaurantState, rooms, dailyReport });

  // 5. New achievements
  const { newAchievements, unlockedAchievements } = checkAchievements(
    { hotelState, restaurantState, dailyReport, reputation, level: levelInfo.level },
    player.unlockedAchievements
  );

  // 6. Rewards
  const rewards = generateRewards({ objectivesCompleted, newAchievements, levelInfo, previousLevel: player.level });

  // 7. Storyline events
  const storylineEvents = generateStorylineEvents({
    cycles,
    levelInfo,
    previousLevel: player.level,
    newAchievements,
    reputation,
    previousReputation: player.reputation,
  });

  const report = {
    reputation,
    xp,
    level: levelInfo,
    objectivesCompleted,
    newAchievements,
    rewards,
    storylineEvents,
  };

  const nextPlayer = {
    xp,
    level: levelInfo.level,
    reputation,
    unlockedAchievements,
  };

  // `cycles` is runDailyCycle.js's day counter (hotelState.progression
  // .cycles): nothing else in the daily cycle currently advances it, so
  // this engine -- the one place that actually needs a running day count
  // (century_club, day-milestone storyline beats) -- owns bumping it.
  return { report, player: nextPlayer, cycles };
}

export const progressionEngine = { runProgression };
export default progressionEngine;
