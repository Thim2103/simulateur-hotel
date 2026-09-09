import { tileToScreen } from "../engine/IsoProjection";
import { ISO_FINAL_PROJECTION } from "./IsoFinalGrid";
import { ROOM_STATE_PALETTE, STROKE_WIDTH, SHADOW_FILTER } from "./IsoFinalStyle";
import { roomProps } from "./IsoFinalSprites";
import { roomTransitionClassName } from "./IsoFinalAnimations";

const STATE_LABEL = { clean: "propre", dirty: "sale", occupied: "occupée", cleaning: "en nettoyage" };

// One room, "bloc isométrique complet" per the Bible: a rounded, pastel
// tile (crisp 45° drop shadow, thin stroke) scattered with 2-3 exaggerated
// props (a wide bed + lamp + a glimpse of the bathroom when clean,
// luggage + clothes when occupied...) so it reads as a furnished room
// rather than a bare status marker.
export default function IsoFinalRoom({ col, row, state, number }) {
  const { x, y } = tileToScreen({ col, row }, ISO_FINAL_PROJECTION);
  const palette = ROOM_STATE_PALETTE[state] || ROOM_STATE_PALETTE.clean;
  const props = roomProps(state);

  return (
    <div
      title={`Chambre ${number ?? ""} — ${STATE_LABEL[state] || STATE_LABEL.clean}`.trim()}
      className={`absolute -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-xl ${roomTransitionClassName(state)}`}
      style={{ left: x, top: y, width: 32, height: 32, backgroundColor: palette.fill, border: `${STROKE_WIDTH} solid ${palette.stroke}`, filter: SHADOW_FILTER }}
    >
      <span aria-hidden="true" className="-rotate-45 flex h-full w-full items-center justify-center gap-0.5 text-[7px]">
        {props.map((prop, index) => (
          <span key={index}>{prop}</span>
        ))}
      </span>
    </div>
  );
}
