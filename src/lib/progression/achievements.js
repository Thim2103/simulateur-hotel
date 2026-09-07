// Long-term, one-time milestones: unlike objectives.js's repeatable daily
// goals, each of these fires at most once per game (tracked via
// `previouslyUnlocked`, persisted across days -- see progressionEngine.js).
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

const ACHIEVEMENT_DEFINITIONS = [
  {
    id: "first_profit",
    name: "Premiers bénéfices",
    description: "Terminer une journée avec un profit positif pour la première fois.",
    condition: ({ dailyReport }) => Number(dailyReport?.profit || 0) > 0,
  },
  {
    id: "five_star_reputation",
    name: "Établissement cinq étoiles",
    description: "Atteindre une réputation de 90 ou plus.",
    condition: ({ reputation }) => Number(reputation || 0) >= 90,
  },
  {
    id: "team_builder",
    name: "Bâtisseur d'équipe",
    description: "Gérer une équipe de 6 collaborateurs ou plus.",
    condition: ({ restaurantState }) => safeArray(restaurantState?.staff).length >= 6,
  },
  {
    id: "sustainability_champion",
    name: "Champion du développement durable",
    description: "Atteindre un score de durabilité ESG de 90 ou plus.",
    condition: ({ hotelState }) => Number(hotelState?.esg?.sustainabilityScore || 0) >= 90,
  },
  {
    id: "century_club",
    name: "Club du centenaire",
    description: "Diriger l'établissement pendant 100 cycles.",
    condition: ({ hotelState }) => Number(hotelState?.progression?.cycles || 0) >= 100,
  },
  {
    id: "veteran_manager",
    name: "Gérant vétéran",
    description: "Atteindre le niveau 5 ou plus.",
    condition: ({ level }) => Number(level || 0) >= 5,
  },
];

// Rolls every not-yet-unlocked achievement against today's state. Returns
// { newAchievements, unlockedAchievements }: the ones unlocked today, and
// the full running list (previously unlocked + today's) to persist for
// tomorrow.
export function checkAchievements(state = {}, previouslyUnlocked = []) {
  const alreadyUnlocked = new Set(safeArray(previouslyUnlocked));

  const newAchievements = ACHIEVEMENT_DEFINITIONS.filter((achievement) => {
    if (alreadyUnlocked.has(achievement.id)) return false;
    try {
      return achievement.condition(state);
    } catch {
      return false;
    }
  }).map((achievement) => ({ id: achievement.id, name: achievement.name, description: achievement.description }));

  const unlockedAchievements = [...alreadyUnlocked, ...newAchievements.map((achievement) => achievement.id)];

  return { newAchievements, unlockedAchievements };
}

export const achievementDefinitions = ACHIEVEMENT_DEFINITIONS;
