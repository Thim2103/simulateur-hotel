// Turns today's completed objectives/achievements/level-up into a list of
// rewards for the report. Purely descriptive: this module doesn't touch
// hotel/restaurant state itself (see runDailyCycle.js for how a caller
// could choose to apply a capital/reputation bonus later).
const OBJECTIVE_XP_REWARD = 15;
const ACHIEVEMENT_XP_REWARD = 100;
const LEVEL_UP_CAPITAL_BONUS = 5000;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function generateRewards({ objectivesCompleted = [], newAchievements = [], levelInfo, previousLevel } = {}) {
  const rewards = [];

  safeArray(objectivesCompleted).forEach((objective) => {
    rewards.push({
      id: `objective_${objective.id}`,
      type: "xp",
      amount: OBJECTIVE_XP_REWARD,
      description: `+${OBJECTIVE_XP_REWARD} XP pour l'objectif "${objective.name}".`,
    });
  });

  safeArray(newAchievements).forEach((achievement) => {
    rewards.push({
      id: `achievement_${achievement.id}`,
      type: "xp",
      amount: ACHIEVEMENT_XP_REWARD,
      description: `+${ACHIEVEMENT_XP_REWARD} XP pour le succès "${achievement.name}".`,
    });
  });

  if (levelInfo && Number.isFinite(previousLevel) && levelInfo.level > previousLevel) {
    rewards.push({
      id: `level_up_${levelInfo.level}`,
      type: "capital",
      amount: LEVEL_UP_CAPITAL_BONUS,
      description: `Bonus de ${LEVEL_UP_CAPITAL_BONUS.toLocaleString()} € de capital pour avoir atteint le niveau ${levelInfo.level} (${levelInfo.title}).`,
    });
  }

  return rewards;
}
