// Player level thresholds, independent of the restaurant module's own
// difficulty levels (lib/restaurant.js's restaurantDifficultyLevels) -- this
// is the overall player/establishment progression, not a difficulty knob.
export const LEVELS = [
  { level: 1, title: "Nouveau gérant", minXp: 0 },
  { level: 2, title: "Gérant confirmé", minXp: 100 },
  { level: 3, title: "Directeur d'établissement", minXp: 300 },
  { level: 4, title: "Directeur général", minXp: 600 },
  { level: 5, title: "Groupe hôtelier", minXp: 1000 },
  { level: 6, title: "Empire hôtelier", minXp: 1500 },
  { level: 7, title: "Légende de l'hôtellerie", minXp: 2500 },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Turns a total XP amount into the current level, its title, and how far
// the player is from the next one.
export function determineLevel(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  const current = [...LEVELS].reverse().find((entry) => safeXp >= entry.minXp) || LEVELS[0];
  const next = LEVELS.find((entry) => entry.minXp > safeXp) || null;

  const progress = next
    ? Math.round(clamp(((safeXp - current.minXp) / (next.minXp - current.minXp)) * 100, 0, 100))
    : 100;

  return {
    level: current.level,
    title: current.title,
    xp: safeXp,
    xpForNextLevel: next ? next.minXp : null,
    xpToNextLevel: next ? next.minXp - safeXp : 0,
    progress,
  };
}
