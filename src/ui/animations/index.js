// One name per animation (see animations.css for the actual keyframes) --
// pages/components import these instead of writing raw `animate-…`
// className strings, so the whole app shares the same fadeIn/slideUp/
// slideLeft/pulse/bounce/shimmer timings. `delay(step)` staggers a list of
// elements (e.g. KPI cards appearing one after another).
import "./animations.css";

export const fadeIn = "gl-anim-fadeIn";
export const slideUp = "gl-anim-slideUp";
export const slideLeft = "gl-anim-slideLeft";
export const pulse = "gl-anim-pulse";
export const bounce = "gl-anim-bounce";
export const shimmer = "gl-anim-shimmer";

// Inline style for a staggered entrance: delay(0) -> no delay, delay(1) ->
// 60ms, delay(2) -> 120ms, etc.
export function delay(step, stepMs = 60) {
  return { animationDelay: `${Math.max(0, step) * stepMs}ms` };
}

const animations = { fadeIn, slideUp, slideLeft, pulse, bounce, shimmer, delay };
export default animations;
