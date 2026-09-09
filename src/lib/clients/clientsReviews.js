// Clients reviews aggregate -- derives the review picture (average
// rating, positive/negative split, trend) from the current satisfaction
// score and the previous cycle's review snapshot. Mirrors the event
// handler in lib/events/eventHandlers/customerReviews.js (which fires
// on specific events) but operates continuously on each cycle.
import { safeNumber, safeObject } from "../safe";

// Maps a 0-100 satisfaction score to a 1-5 average rating.
function scoreToRating(score) {
  const s = safeNumber(score, 65);
  return Math.round(((s / 100) * 4 + 1) * 10) / 10;
}

// Estimates the positive/negative split from the rating.
// Positive = % of guests rating 4+/5, Negative = % rating 2-/5.
function splitFromRating(rating) {
  const r = safeNumber(rating, 3.5);
  // Linear approximation: at 5.0 → 95 % positive / 2 % negative
  //                        at 3.5 → 65 % positive / 15 % negative
  //                        at 1.0 → 10 % positive / 80 % negative
  const positive = Math.round(Math.min(98, Math.max(5, (r - 1) * 28.33 + 10)));
  const negative = Math.round(Math.min(85, Math.max(1, (5 - r) * 20 - 3)));
  return { positive, negative };
}

// Trend detection: compare this cycle's rating to previous.
function detectTrend(currentRating, previousRating) {
  const delta = safeNumber(currentRating, 0) - safeNumber(previousRating, 0);
  if (delta > 0.15) return "improving";
  if (delta < -0.15) return "declining";
  return "stable";
}

// Accumulates a synthetic review count that grows with each cycle
// (simulating an always-growing review corpus).
function updateCount(previousCount, occupiedRooms) {
  // Assume ~30 % of checked-out guests leave a review per cycle.
  const newReviews = Math.max(0, Math.round(safeNumber(occupiedRooms, 2) * 0.3));
  return safeNumber(previousCount, 0) + Math.max(1, newReviews);
}

export function computeReviews({ satisfaction = null, previousReviews = null, occupiedRooms = 0 } = {}) {
  const prev = safeObject(previousReviews);
  const prevRating = safeNumber(prev.avgRating, null);

  const avgRating = scoreToRating(satisfaction ?? 65);
  const { positive, negative } = splitFromRating(avgRating);
  const trend = prevRating !== null ? detectTrend(avgRating, prevRating) : "stable";
  const count = updateCount(prev.count, occupiedRooms);

  return { avgRating, count, positive, negative, trend };
}
