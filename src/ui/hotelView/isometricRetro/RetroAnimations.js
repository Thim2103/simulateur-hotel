// The retro-modern view's animation engine -- same "CSS classes +
// requestAnimationFrame retrigger" contract as v3's IsoAnimations.js /
// v2's HotelAnimations.js / ui/radialNav/radialAnimations.js (see any of
// their docstrings for the full rationale). Each function here targets a
// *named* cartoon action (walk/clean/eat/check-in/incident/room
// transition) rather than a generic "pulse", matching the spec's own
// function names.
import "./retroView.css";

function retrigger(el, className) {
  if (!el) return;
  el.classList.remove(className);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add(className));
  });
}

export function walkCycle(el) {
  retrigger(el, "retro-walk-cycle");
}

export function cleanCycle(el) {
  retrigger(el, "retro-clean-cycle");
}

export function eatCycle(el) {
  retrigger(el, "retro-eat-cycle");
}

export function checkinCycle(el) {
  retrigger(el, "retro-checkin-cycle");
}

export function incidentPulse(el) {
  retrigger(el, "retro-incident-pulse");
}

const ROOM_TRANSITION_CLASS = {
  clean: "retro-room-clean",
  dirty: "retro-room-dirty",
  occupied: "retro-room-occupied",
  cleaning: "retro-room-cleaning",
};

export function roomTransitionClassName(state) {
  return ROOM_TRANSITION_CLASS[state] || ROOM_TRANSITION_CLASS.clean;
}

export function roomTransition(el, state) {
  retrigger(el, roomTransitionClassName(state));
}

const RetroAnimations = { walkCycle, cleanCycle, eatCycle, checkinCycle, incidentPulse, roomTransition, roomTransitionClassName };
export default RetroAnimations;
