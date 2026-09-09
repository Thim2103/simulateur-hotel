import { toIso } from "./IsoGrid";
import { isoGuestSprite, isoStaffSprite } from "./IsoSprites";
import "./isoView.css";

// One ambient guest or staff sprite at its projected {col, row} (see
// IsoGrid.jsx's toIso() -- `col`/`row` are usually fractional after
// IsoPathfinding.js's avoidCollisions() nudges overlapping characters
// apart). Bobs gently in place (iso-bounce, see isoView.css); real
// movement between two cells is driven imperatively by
// IsoAnimations.js's isoMoveCharacter() on this element's own DOM node,
// not by React re-rendering a new col/row every frame.
export default function IsoCharacter({ kind, col, row, activity = "idle" }) {
  const { x, y } = toIso(col, row);
  const sprite = kind === "staff" ? isoStaffSprite(activity) : isoGuestSprite(activity);
  return (
    <span
      aria-hidden="true"
      data-kind={kind}
      className="iso-bounce absolute -translate-x-1/2 -translate-y-full text-lg leading-none"
      style={{ left: x, top: y }}
    >
      {sprite}
    </span>
  );
}
