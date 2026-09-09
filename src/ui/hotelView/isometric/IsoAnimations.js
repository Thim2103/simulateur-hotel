// The isometric view's animation engine -- same "CSS classes +
// requestAnimationFrame retrigger" contract as
// ui/hotelView/v2/HotelAnimations.js/ui/radialNav/radialAnimations.js
// (see either's docstring for the full rationale): each function here
// re-applies a CSS class (see isoView.css) or a `left`/`top` style to an
// already-mounted element on the next animation frame, so it replays even
// when React's own re-render wouldn't otherwise change anything.
import "./isoView.css";
import { isoRoomSprite } from "./IsoSprites";

function retrigger(el, className) {
  if (!el) return;
  el.classList.remove(className);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add(className));
  });
}

// Moves a character sprite from one projected {x, y} to another with a
// CSS transition -- `fromIso`/`toIso` are already-projected screen
// coordinates (see IsoGrid.jsx's toIso()), this function only handles the
// DOM side of animating between them.
export function isoMoveCharacter(el, fromIso, toIso, duration = 800) {
  if (!el) return;
  if (fromIso) {
    el.style.transition = "none";
    el.style.transform = `translate(${fromIso.x}px, ${fromIso.y}px)`;
  }
  requestAnimationFrame(() => {
    el.style.transition = `transform ${duration}ms ease-in-out`;
    if (toIso) el.style.transform = `translate(${toIso.x}px, ${toIso.y}px)`;
  });
}

const ROOM_STATE_CLASS = {
  clean: "iso-room-clean",
  dirty: "iso-room-dirty",
  occupied: "iso-room-occupied",
  cleaning: "iso-room-cleaning",
};

export function isoAnimateRoomState(el, state) {
  retrigger(el, ROOM_STATE_CLASS[state] || ROOM_STATE_CLASS.clean);
}

export function isoAnimateIncident(el) {
  retrigger(el, "iso-pulse");
}

export function isoPulse(el) {
  retrigger(el, "iso-pulse");
}

export function isoBounce(el) {
  retrigger(el, "iso-bounce");
}

export function isoFade(el) {
  retrigger(el, "iso-fade-in");
}

const IsoAnimations = { isoMoveCharacter, isoAnimateRoomState, isoAnimateIncident, isoPulse, isoBounce, isoFade, isoRoomSprite };
export default IsoAnimations;
