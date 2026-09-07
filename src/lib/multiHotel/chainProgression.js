// Chain-level progression, layered on top of (not replacing) each hotel's
// own progressionReport (see lib/progression/): a chain XP/level track,
// an averaged chain reputation, and chain-wide achievements (multi-hotel/
// multi-region milestones an individual hotel could never unlock alone).
import { determineLevel } from "../progression/levels";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

const CHAIN_ACHIEVEMENT_DEFINITIONS = [
  {
    id: "chain_builder",
    name: "Bâtisseur de chaîne",
    description: "Exploiter 3 hôtels ou plus simultanément.",
    condition: ({ hotelCount }) => hotelCount >= 3,
  },
  {
    id: "multi_regional",
    name: "Présence multirégionale",
    description: "Être implanté dans 3 villes différentes ou plus.",
    condition: ({ cityCount }) => cityCount >= 3,
  },
  {
    id: "global_empire",
    name: "Empire mondial",
    description: "Exploiter 10 hôtels ou plus simultanément.",
    condition: ({ hotelCount }) => hotelCount >= 10,
  },
  {
    id: "profitable_network",
    name: "Réseau rentable",
    description: "Terminer une journée avec un profit consolidé positif sur toute la chaîne.",
    condition: ({ totalProfit }) => totalProfit > 0,
  },
];

// XP gain scales with the network's daily profit and, modestly, with how
// many hotels are being actively managed (a larger network is harder to run).
function calculateChainXpGain({ totalProfit, hotelCount }) {
  const baseline = 5 * Math.max(1, hotelCount);
  const profitBonus = totalProfit > 0 ? Math.min(200, Math.round(totalProfit / 500)) : 0;
  return Math.max(1, baseline + profitBonus);
}

function averageReputation(results) {
  const reputations = safeArray(results)
    .map(({ dailyReport }) => Number(dailyReport?.progressionReport?.reputation))
    .filter((value) => Number.isFinite(value));
  if (!reputations.length) return 50;
  return Math.round(reputations.reduce((sum, value) => sum + value, 0) / reputations.length);
}

// results: [{ hotel, dailyReport }] from chainEngine.js. previousState: the
// chain's persisted { xp, unlockedAchievements } from the prior cycle (see
// chainEngine.js's returned chainProgressionState).
export function updateChainProgression({ results = [], totalProfit = 0, previousState = {} } = {}) {
  const hotelCount = safeArray(results).length;
  const cityCount = new Set(safeArray(results).map(({ hotel }) => hotel.city).filter(Boolean)).size;
  const previouslyUnlocked = new Set(safeArray(previousState.unlockedAchievements));

  const context = { hotelCount, cityCount, totalProfit };
  const achievements = CHAIN_ACHIEVEMENT_DEFINITIONS.filter((definition) => {
    if (previouslyUnlocked.has(definition.id)) return false;
    try {
      return definition.condition(context);
    } catch {
      return false;
    }
  }).map((definition) => ({ id: definition.id, name: definition.name, description: definition.description }));

  const unlockedAchievements = [...previouslyUnlocked, ...achievements.map((achievement) => achievement.id)];

  const xp = Number(previousState.xp || 0) + calculateChainXpGain({ totalProfit, hotelCount });
  const levelInfo = determineLevel(xp);
  const chainReputation = averageReputation(results);

  return {
    progression: {
      chainLevel: levelInfo,
      chainXP: xp,
      chainReputation,
      achievements,
    },
    nextState: { xp, unlockedAchievements },
  };
}
