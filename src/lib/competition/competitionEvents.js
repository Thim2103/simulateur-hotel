// The seed-sharing and event-synchronization core of Competition: every
// player must see exactly the same random events on the same cycle, no
// matter which player's cycle gets played first, or how many other
// players have already played theirs. See competitionEngine.js, which
// derives a fresh rng from (match seed, cycleIndex) for every single
// runPlayerCycle() call instead of threading one shared, order-sensitive
// rng object through every player.
import { safeArray, safeObject, safeString } from "../safe";

// A small, dependency-free deterministic PRNG (mulberry32) -- good enough
// for gameplay randomness, not for cryptography. Two calls with the same
// `a` always start from the same internal state, so the sequence of
// values .next() produces is identical every time.
function mulberry32(a) {
  let state = a;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministically turns an arbitrary string into a 32-bit seed (a
// simple FNV-1a hash) -- so a human-readable seed like "match-42" works
// just as well as a random one.
function hashSeed(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Ensures a scenario has a seed before it's assigned to a match -- a
// scenario authored without one (competition mode requires one, see
// scenarioSchema.js's validateScenario()) gets a fresh, stable one derived
// from the match id so re-assigning the same scenario to the same match
// twice stays reproducible.
export function ensureSharedSeed(scenario, matchId) {
  const existing = safeObject(scenario?.replay).seed;
  if (existing) return scenario;
  return { ...scenario, replay: { ...safeObject(scenario?.replay), seed: `match-${matchId}` } };
}

// The function every player's cycle N is scored against: a fresh
// generator seeded from `${seed}:${cycleIndex}` alone, so it is entirely
// independent of call order across players -- player A's cycle 3 and
// player B's cycle 3 draw the exact same sequence of "random" numbers.
export function createSeededRng(seed, cycleIndex = 0) {
  return mulberry32(hashSeed(`${safeString(seed, "seed")}:${cycleIndex}`));
}

// Adds an organizer-triggered global event to the match's shared scenario
// (e.g. a market-wide crisis declared mid-match), and re-points every
// player's run at the updated scenario object so it takes effect on their
// very next cycle.
export function injectGlobalEvent(match, runsByPlayerId, event) {
  const nextScenario = { ...match.scenario, events: [...safeArray(match.scenario?.events), event] };
  const nextRuns = Object.fromEntries(
    Object.entries(safeObject(runsByPlayerId)).map(([playerId, run]) => [playerId, run ? { ...run, scenario: nextScenario } : run])
  );
  return { scenario: nextScenario, runsByPlayerId: nextRuns };
}
