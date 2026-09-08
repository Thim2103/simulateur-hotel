// Qualité housekeeping (cleanliness score, 0-100) -- section 1. Blends
// how much time was actually available per room against the baseline
// (rushed cleans hurt quality), the team's productivity/training, and
// today's real guest satisfaction from RM (a clean room is only part of
// what satisfaction measures, but it's the clearest external signal
// available -- see lib/calculs/rm.js) -- "synchroniser avec RM (impact
// satisfaction)" (section 5).
import { safeNumber } from "../safe";

const BASELINE_MINUTES_PER_ROOM = 30; // a comfortable, unrushed clean

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function computeQualityScore({ minutesPerRoom = BASELINE_MINUTES_PER_ROOM, productivity = 65, trainingLevel = 50, rmSatisfaction = null } = {}) {
  const paceRatio = clamp(safeNumber(minutesPerRoom, BASELINE_MINUTES_PER_ROOM) / BASELINE_MINUTES_PER_ROOM, 0, 2);
  const paceScore = clamp(paceRatio * 70, 0, 90); // rushing below baseline caps quality; more time than baseline plateaus around 90
  const skillScore = safeNumber(productivity, 65) * 0.5 + safeNumber(trainingLevel, 50) * 0.5;

  const blended = paceScore * 0.4 + skillScore * 0.4 + (rmSatisfaction !== null && rmSatisfaction !== undefined ? safeNumber(rmSatisfaction, 70) : skillScore) * 0.2;
  return Math.round(clamp(blended, 0, 100));
}

export function qualityTier(score) {
  const value = safeNumber(score, 0);
  if (value >= 85) return "excellente";
  if (value >= 65) return "bonne";
  if (value >= 45) return "correcte";
  return "insuffisante";
}

export function qualityTrend(previousScore, currentScore) {
  if (!Number.isFinite(previousScore)) return 0;
  return Math.round(safeNumber(currentScore, 0) - safeNumber(previousScore, 0));
}
