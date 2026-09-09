// The premium view's animation engine -- same "CSS classes +
// requestAnimationFrame retrigger" contract every animation module in
// this codebase uses (see v2's HotelAnimations.js/v3's IsoAnimations.js/
// RetroView's RetroAnimations.js for the full rationale, repeated
// independently here rather than imported). One named function per cycle
// the Bible asks for.
import "./isoFinalView.css";

function retrigger(el, className) {
  if (!el) return;
  el.classList.remove(className);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add(className));
  });
}

export function walkCycle(el) {
  retrigger(el, "if-walk-cycle");
}
export function cleanCycle(el) {
  retrigger(el, "if-clean-cycle");
}
export function eatCycle(el) {
  retrigger(el, "if-eat-cycle");
}
export function checkinCycle(el) {
  retrigger(el, "if-checkin-cycle");
}
export function cookCycle(el) {
  retrigger(el, "if-cook-cycle");
}
export function barCycle(el) {
  retrigger(el, "if-bar-cycle");
}
export function laundryCycle(el) {
  retrigger(el, "if-laundry-cycle");
}
export function incidentPulse(el) {
  retrigger(el, "if-incident-pulse");
}

const ROOM_TRANSITION_CLASS = {
  clean: "if-room-clean",
  dirty: "if-room-dirty",
  occupied: "if-room-occupied",
  cleaning: "if-room-cleaning",
};

export function roomTransitionClassName(state) {
  return ROOM_TRANSITION_CLASS[state] || ROOM_TRANSITION_CLASS.clean;
}

export function roomTransition(el, state) {
  retrigger(el, roomTransitionClassName(state));
}

// Activity -> the cycle it plays by default -- IsoFinalCharacter.jsx's own
// lookup, exported here so it lives next to the cycles themselves.
export const ACTIVITY_CYCLE_CLASS = {
  walking: "if-walk-cycle",
  cleaning: "if-clean-cycle",
  eating: "if-eat-cycle",
  checkin: "if-checkin-cycle",
  cooking: "if-cook-cycle",
  bartending: "if-bar-cycle",
  laundry: "if-laundry-cycle",
  serving: "if-clean-cycle",
};

export function activityCycleClassName(activity) {
  return ACTIVITY_CYCLE_CLASS[activity] || "if-walk-cycle";
}

const IsoFinalAnimations = {
  walkCycle,
  cleanCycle,
  eatCycle,
  checkinCycle,
  cookCycle,
  barCycle,
  laundryCycle,
  incidentPulse,
  roomTransition,
  roomTransitionClassName,
  activityCycleClassName,
};
export default IsoFinalAnimations;
