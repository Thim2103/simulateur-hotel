// Narrative beats tied to progression milestones: a level-up, an
// achievement unlock, or a round-number day count. Purely flavor text for
// the DailyReport/ProgressionDashboard -- no gameplay effect.
const DAY_MILESTONES = [7, 30, 100, 365];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function generateStorylineEvents({ cycles = 0, levelInfo, previousLevel, newAchievements = [], reputation, previousReputation } = {}) {
  const events = [];

  if (levelInfo && Number.isFinite(previousLevel) && levelInfo.level > previousLevel) {
    events.push({
      id: `level_up_${levelInfo.level}`,
      title: "Montée en niveau",
      message: `Vous êtes désormais ${levelInfo.title.toLowerCase()} (niveau ${levelInfo.level}).`,
    });
  }

  safeArray(newAchievements).forEach((achievement) => {
    events.push({
      id: `achievement_${achievement.id}`,
      title: "Succès débloqué",
      message: `"${achievement.name}" : ${achievement.description}`,
    });
  });

  if (DAY_MILESTONES.includes(Number(cycles))) {
    events.push({
      id: `day_milestone_${cycles}`,
      title: "Étape franchie",
      message: `Cela fait maintenant ${cycles} jours que vous dirigez cet établissement.`,
    });
  }

  // Only fire the instant reputation crosses the threshold, not every day
  // it stays there.
  if (Number(reputation) >= 95 && !(Number.isFinite(previousReputation) && previousReputation >= 95)) {
    events.push({
      id: "press_feature",
      title: "Article de presse",
      message: "Un magazine de voyage réputé mentionne votre établissement parmi les meilleures adresses de la région.",
    });
  }

  return events;
}
