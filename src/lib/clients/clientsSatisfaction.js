// Clients satisfaction score -- computes the overall 0-100 guest
// satisfaction index from the five operational modules that directly
// affect a guest's experience, weighted by their relative impact:
//
//   Housekeeping quality  30 % -- room cleanliness is the #1 driver of
//                                 negative reviews everywhere in the
//                                 hospitality literature.
//   Staff service         20 % -- front-desk/concierge warmth.
//   RM price-value        20 % -- ADR vs. perceived value; guests who
//                                 paid above their expectation are less
//                                 satisfied.
//   Restaurant            15 % -- F&B satisfaction from the daily report.
//   ESG                   10 % -- increasingly important for premium and
//                                 leisure segments (eco certification,
//                                 waste management).
//   Marketing reputation   5 % -- brand promise kept/not kept.
//
// All six inputs are optional (null = unavailable); the score is
// computed from whichever are present so the module works on day 1
// (Guest Mode, first day of career) before all modules have fired.
import { safeNumber } from "../safe";

export const SATISFACTION_WEIGHTS = {
  housekeeping: 0.30,
  staff: 0.20,
  rm: 0.20,
  restaurant: 0.15,
  esg: 0.10,
  marketing: 0.05,
};

// Converts a 1-5 restaurant satisfaction rating to a 0-100 score.
export function restaurantRatingToScore(rating) {
  const r = safeNumber(rating, 0);
  if (r <= 0) return null;
  return Math.round(((r - 1) / 4) * 100);
}

// Converts an RM price-value pressure to a satisfaction modifier.
// rmSatisfaction: 0-100, where 100 = perfectly priced, 0 = overpriced.
// If null, the RM component is excluded from the weighted average.
export function computeSatisfaction({
  housekeepingQuality = null,
  staffMorale = null,
  rmSatisfaction = null,
  restaurantSatisfaction = null,
  esgScore = null,
  marketingReputation = null,
} = {}) {
  const inputs = [
    { weight: SATISFACTION_WEIGHTS.housekeeping, value: housekeepingQuality },
    { weight: SATISFACTION_WEIGHTS.staff, value: staffMorale },
    { weight: SATISFACTION_WEIGHTS.rm, value: rmSatisfaction },
    { weight: SATISFACTION_WEIGHTS.restaurant, value: restaurantSatisfaction },
    { weight: SATISFACTION_WEIGHTS.esg, value: esgScore },
    { weight: SATISFACTION_WEIGHTS.marketing, value: marketingReputation },
  ].filter((entry) => entry.value !== null && entry.value !== undefined);

  if (inputs.length === 0) return 65; // baseline when no module has run yet

  const totalWeight = inputs.reduce((sum, entry) => sum + entry.weight, 0);
  const weightedSum = inputs.reduce((sum, entry) => sum + entry.weight * safeNumber(entry.value, 0), 0);

  return Math.round(Math.min(100, Math.max(0, weightedSum / totalWeight)));
}

// Converts a 0-100 satisfaction score to a 1-5 star rating (for
// display alongside existing 1-5 satisfaction fields in the codebase).
export function satisfactionToStars(score) {
  const s = safeNumber(score, 0);
  return Math.round(((s / 100) * 4 + 1) * 10) / 10;
}
