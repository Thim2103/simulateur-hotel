// The scene's own animation clock: a `requestAnimationFrame` loop that
// computes a clamped `deltaSeconds` each frame and hands it to a caller-
// supplied `onTick(deltaSeconds)`. Framework-independent (no React) and
// domain-independent (no notion of "room"/"guest"/hotel anything, and
// critically no notion of the hotel's own game day either -- see this
// module's own "FRAME TIME vs GAME TIME" note below) -- same reasoning
// IsoProjection.js, DepthSort.js and MotionSystem.js already followed.
//
// FRAME TIME vs GAME TIME: this loop only ever measures wall-clock time
// between animation frames, for the sole purpose of driving smooth visual
// motion (MotionSystem.js's interpolation). It does not, and must never,
// advance the hotel's own simulated day/events/progression -- that's GAME
// TIME, and it already has its own, entirely separate, business-logic
// clock elsewhere in this codebase. Nothing in this file reads or writes
// anything hotel-related.
import { safeNumber } from "../../../lib/safe";

// A single very long frame (the tab was backgrounded, a breakpoint was
// hit, the user alt-tabbed away for a while...) must never be handed to
// `onTick` as-is -- MotionSystem.js would advance a moving entity's
// progress by that entire gap in one step, visually teleporting it toward
// its target instead of animating. Clamping `deltaSeconds` to a small,
// reasonable ceiling turns "the tab was hidden for 10 minutes" into "one
// slightly chunky frame" instead.
export const MAX_DELTA_SECONDS = 0.25;

// Creates one scene loop. `onTick(deltaSeconds)` is called once per
// animation frame while running and not paused; it receives 0 on the very
// first frame after a `start()`/`resume()` (there is no previous
// timestamp yet to diff against), so a caller never sees a bogus initial
// jump either.
export function createSceneLoop(onTick) {
  const tick = typeof onTick === "function" ? onTick : () => {};

  let rafId = null;
  let lastTimestamp = null;
  let running = false;
  let paused = false;

  function frame(timestamp) {
    if (!running || paused) return;

    const deltaSeconds = lastTimestamp === null ? 0 : Math.min(Math.max(0, (timestamp - lastTimestamp) / 1000), MAX_DELTA_SECONDS);
    lastTimestamp = timestamp;

    tick(deltaSeconds);

    // `running`/`paused` may have been flipped synchronously by `tick`
    // itself (e.g. a callback that calls `pause()`) -- re-check before
    // scheduling the next frame rather than scheduling unconditionally.
    if (running && !paused) {
      rafId = requestAnimationFrame(frame);
    }
  }

  return {
    // No-op if already running: guarantees a single active
    // requestAnimationFrame chain per loop, never two.
    start() {
      if (running && !paused) return;
      running = true;
      paused = false;
      lastTimestamp = null;
      rafId = requestAnimationFrame(frame);
    },

    // Freezes progress in place -- the next `resume()` continues exactly
    // where this left off, it does not lose or replay elapsed time.
    pause() {
      if (!running || paused) return;
      paused = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },

    resume() {
      if (!running || !paused) return;
      paused = false;
      // Discard the stale timestamp: the gap spent paused must not be
      // counted as elapsed animation time (same reasoning as the very
      // first frame above).
      lastTimestamp = null;
      rafId = requestAnimationFrame(frame);
    },

    stop() {
      running = false;
      paused = false;
      lastTimestamp = null;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },

    isRunning: () => running && !paused,
    isPaused: () => running && paused,
  };
}

const SceneLoop = { createSceneLoop, MAX_DELTA_SECONDS: safeNumber(MAX_DELTA_SECONDS) };
export default SceneLoop;
