import { toIsoFinal } from "./IsoFinalGrid";
import { incidentSprite } from "./IsoFinalSprites";
import { PALETTE, SHADOW_FILTER } from "./IsoFinalStyle";
import "./isoFinalView.css";

// One visible incident marker -- a bold cherry-red pulsing disc
// (if-incident-pulse, see isoFinalView.css). Split into a static
// positioning wrapper + an animated inner disc, same reasoning as
// IsoFinalCharacter.jsx's own docstring.
export default function IsoFinalIncident({ col, row, type = "breakdown", message }) {
  const { x, y } = toIsoFinal(col, row);
  return (
    <span title={message} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: x, top: y }}>
      <span
        className="if-incident-pulse flex h-7 w-7 items-center justify-center rounded-full text-sm"
        style={{ backgroundColor: "#fde2e2", border: `2px solid ${PALETTE.cherryRed}`, filter: SHADOW_FILTER }}
      >
        <span aria-hidden="true">{incidentSprite(type)}</span>
      </span>
    </span>
  );
}
