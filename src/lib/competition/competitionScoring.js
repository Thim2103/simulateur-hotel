// Competition doesn't compute its own scores -- lib/scenario/
// scenarioScoring.js already does that, once per cycle, inside
// scenarioEngine.playScenarioCycle(). This file only enforces the rule
// that makes a leaderboard fair: every player's run must share the exact
// same scoring formula, never a per-player override.
import { safeArray, safeObject } from "../safe";

export function validateCommonScoring(scenario) {
  const errors = [];
  if (!safeObject(scenario?.scoring).weights) errors.push("Le scénario de compétition doit définir des poids de scoring communs.");
  if (!safeObject(scenario?.replay).seed) errors.push("Le scénario de compétition doit avoir une graine (seed) partagée.");
  return { valid: errors.length === 0, errors };
}

export function currentScoreForPlayer(runState) {
  const history = safeArray(runState?.scoreHistory);
  return history.length ? history[history.length - 1] : null;
}

export function scoreHistoryForPlayer(runState) {
  return safeArray(runState?.scoreHistory);
}
