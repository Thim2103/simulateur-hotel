// The Radial Navigation's animation engine -- same "CSS classes +
// requestAnimationFrame retrigger" contract as
// ui/hotelView/v2/HotelAnimations.js (see its own docstring for the full
// rationale): each function here re-adds a CSS class (see radialNav.css)
// to an already-mounted element on the next animation frame, so the
// animation replays even when React's own re-render wouldn't otherwise
// change anything (e.g. hovering the same branch twice in a row).
import "./radialNav.css";

function retrigger(el, className) {
  if (!el) return;
  el.classList.remove(className);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add(className));
  });
}

export function animateBranchEnter(el) {
  retrigger(el, "rn-branch-enter");
}

export function animateBranchExit(el) {
  retrigger(el, "rn-branch-exit");
}

export function animateHubPulse(el) {
  retrigger(el, "rn-hub-pulse");
}

export function animateHubGlow(el) {
  retrigger(el, "rn-hub-glow");
}

export function animateBranchHover(el) {
  retrigger(el, "rn-branch-hover");
}

export function animateBranchSelect(el) {
  retrigger(el, "rn-branch-select");
}

const radialAnimations = {
  animateBranchEnter,
  animateBranchExit,
  animateHubPulse,
  animateHubGlow,
  animateBranchHover,
  animateBranchSelect,
};
export default radialAnimations;
