// HotelView2D v2's animation engine: CSS transitions/keyframes do the
// actual motion (see hotelView2d.css + ui/animations/animations.css), this
// module is the small, framework-agnostic layer that (a) maps a domain
// state (room state, incident type, KPI name) to the right CSS class, and
// (b) *retriggers* a CSS animation on an already-mounted DOM element --
// which a plain className change can't do when the class name doesn't
// change (e.g. two "pricing" decisions in a row should both pulse the
// rooms, even though the className is the same both times). That retrigger
// is the one place this module touches the DOM directly, and it does it
// with requestAnimationFrame: forcing a reflow synchronously (the classic
// `void el.offsetWidth` trick) works too, but rAF defers the class-add to
// the next paint, which is a more reliable trigger across browsers and is
// what the spec asks for ("CSS transitions + requestAnimationFrame").
import "./hotelView2d.css";
import { fadeIn, slideUp, bounce, shimmer, pulse } from "../../animations";

export const ROOM_STATE_CLASS = {
  clean: "hv-room-clean",
  dirty: "hv-room-dirty",
  occupied: "hv-room-occupied",
  cleaning: "hv-room-cleaning",
};

// Resolves a room's actual (careerState.hotel.rooms) fields into one of
// the 4 display states the spec asks for -- "cleaning" is never a
// persisted engine field (see lib/dailyCycle/updateReservations.js: only
// "clean"/"dirty" exist), it's a transient UI state HotelRoomsLayer.jsx
// applies for a few seconds after a housekeeping-flavoured decision (see
// HotelView2DAnimated.jsx's `cleaningRoomIds`).
export function roomDisplayState(room, isCleaning = false) {
  if (isCleaning) return "cleaning";
  if (room?.status === "occupée") return "occupied";
  if (room?.housekeeping_status === "dirty") return "dirty";
  return "clean";
}

export function roomStateClassName(state) {
  return ROOM_STATE_CLASS[state] || ROOM_STATE_CLASS.clean;
}

// Re-adds `className` to `el` on the next animation frame so a CSS
// animation restarts even if the class was already present -- the actual
// "retrigger" primitive every helper below is built on.
export function retriggerAnimation(el, className) {
  if (!el) return;
  el.classList.remove(className);
  requestAnimationFrame(() => {
    // A second frame: removing then immediately re-adding within the same
    // frame can get coalesced by the browser into a no-op.
    requestAnimationFrame(() => el.classList.add(className));
  });
}

export function moveCharacter(el, { from, to } = {}, duration = 800) {
  if (!el) return;
  if (from) {
    el.style.transition = "none";
    el.style.left = from;
  }
  requestAnimationFrame(() => {
    el.style.transition = `left ${duration}ms ease-in-out`;
    if (to) el.style.left = to;
  });
}

export function animateRoomState(el, state) {
  retriggerAnimation(el, roomStateClassName(state));
}

export function animateIncident(el) {
  retriggerAnimation(el, pulse);
}

export function pulseKpi(el) {
  retriggerAnimation(el, pulse);
}

const ANIMATION_CLASS = { fadeIn, slideUp, bounce, shimmer, pulse };

// Generic "play this named animation again" -- what HotelView2DAnimated.jsx
// uses for decision feedback (pricing -> pulse the rooms, marketing ->
// shimmer the reception, restaurant -> bounce the restaurant block...).
export function playAnimation(el, name) {
  retriggerAnimation(el, ANIMATION_CLASS[name] || ANIMATION_CLASS.pulse);
}

const HotelAnimations = {
  ROOM_STATE_CLASS,
  roomDisplayState,
  roomStateClassName,
  retriggerAnimation,
  moveCharacter,
  animateRoomState,
  animateIncident,
  pulseKpi,
  playAnimation,
};
export default HotelAnimations;
