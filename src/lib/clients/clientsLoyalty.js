// Clients loyalty score -- 0-100 index that grows when satisfaction
// is high and stabilises (or decays) when satisfaction drops. A slow-
// moving metric: good service accumulates loyalty over many cycles;
// a single bad cycle dents it but doesn't erase it. Same "run-rate
// extrapolation" approach lib/marketing/marketingReputation.js uses for
// the hotel's overall reputation score.
import { safeNumber, safeObject } from "../safe";

const LOYALTY_FLOOR = 0;
const LOYALTY_CEILING = 100;
const CARRY_WEIGHT = 0.85; // previous loyalty's inertia
const SATISFACTION_WEIGHT = 0.15; // this cycle's satisfaction contribution

// Decays loyalty slightly when satisfaction falls below 50.
const DECAY_THRESHOLD = 50;
const DECAY_PER_POINT_BELOW = 0.15; // additional decay per point below threshold

// Bonus for high satisfaction: exceeding 75 gives a small extra lift.
const LIFT_THRESHOLD = 75;
const LIFT_PER_POINT_ABOVE = 0.08;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function computeLoyalty({ satisfaction = null, previousLoyalty = null, segments = null } = {}) {
  const sat = safeNumber(satisfaction, 65);
  const prev = safeNumber(previousLoyalty, 50); // start at 50 on day 1

  // Weighted blend: mostly carried forward, partly refreshed
  let next = CARRY_WEIGHT * prev + SATISFACTION_WEIGHT * sat;

  // Decay when satisfaction is poor
  if (sat < DECAY_THRESHOLD) {
    next -= (DECAY_THRESHOLD - sat) * DECAY_PER_POINT_BELOW;
  }

  // Lift when satisfaction is excellent
  if (sat > LIFT_THRESHOLD) {
    next += (sat - LIFT_THRESHOLD) * LIFT_PER_POINT_ABOVE;
  }

  // Premium segment boosts loyalty slightly (high-value repeat guests)
  const premium = safeNumber(safeObject(segments).premium, 10);
  if (premium > 15) {
    next += (premium - 15) * 0.05;
  }

  return Math.round(clamp(next, LOYALTY_FLOOR, LOYALTY_CEILING));
}

// Loyalty grade label for display.
export function loyaltyGrade(loyalty) {
  const l = safeNumber(loyalty, 0);
  if (l >= 85) return "Fidèles ambassadeurs";
  if (l >= 70) return "Clients réguliers";
  if (l >= 55) return "En cours de fidélisation";
  if (l >= 40) return "Occasionnels";
  return "Clientèle volatile";
}
