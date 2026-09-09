import { toIsoRetro } from "./RetroGrid";
import { retroIncidentSprite } from "./RetroSprites";
import { RETRO_SHADOW } from "./RetroStyle";
import "./retroView.css";

// One visible incident marker, retro-modern style: a bold pastel-pink
// pulsing disc (retro-incident-pulse, see retroView.css) at its projected
// {col, row}. Split into a static positioning wrapper + an animated inner
// disc, same reasoning as RetroCharacter.jsx's own docstring (an
// `animation` replaces `transform` outright, so the centering translate
// can't live on the same element as the pulse's scale animation).
export default function RetroIncident({ col, row, type = "breakdown", message }) {
  const { x, y } = toIsoRetro(col, row);
  return (
    <span title={message} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: x, top: y }}>
      <span
        className="retro-incident-pulse flex h-7 w-7 items-center justify-center rounded-full bg-[#fce7f3] text-sm"
        style={{ border: "2px solid #db2777", filter: RETRO_SHADOW }}
      >
        <span aria-hidden="true">{retroIncidentSprite(type)}</span>
      </span>
    </span>
  );
}
