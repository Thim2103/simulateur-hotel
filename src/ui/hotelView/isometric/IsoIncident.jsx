import { toIso } from "./IsoGrid";
import { isoIncidentSprite } from "./IsoSprites";
import "./isoView.css";

// One visible incident marker at a projected {col, row} -- pulses to draw
// the eye (iso-pulse, see isoView.css), same red severity vocabulary as
// v2's IncidentIcon.jsx/AttentionPanel.
export default function IsoIncident({ col, row, type = "breakdown", message }) {
  const { x, y } = toIso(col, row);
  return (
    <span
      title={message}
      className="iso-pulse absolute flex h-6 w-6 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-rose-100 text-sm shadow"
      style={{ left: x, top: y }}
    >
      <span aria-hidden="true">{isoIncidentSprite(type)}</span>
    </span>
  );
}
