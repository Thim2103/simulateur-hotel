import { toIsoRetro } from "./RetroGrid";
import { ROOM_STATE_PALETTE, RETRO_SHADOW, RETRO_STROKE_WIDTH } from "./RetroStyle";
import { retroRoomProps } from "./RetroSprites";
import { roomTransitionClassName } from "./RetroAnimations";

const STATE_LABEL = { clean: "propre", dirty: "sale", occupied: "occupée", cleaning: "en nettoyage" };

// One room, retro-modern style: a rounded, pastel-filled isometric tile
// (thin stroke, crisp drop shadow -- see RetroStyle.js) with 1-2 small
// decorative props scattered on it (bed/lamp, luggage, cleaning cart...)
// so it reads as a furnished room rather than a bare status marker.
export default function RetroRoom({ col, row, state, number }) {
  const { x, y } = toIsoRetro(col, row);
  const palette = ROOM_STATE_PALETTE[state] || ROOM_STATE_PALETTE.clean;
  const props = retroRoomProps(state);

  return (
    <div
      title={`Chambre ${number ?? ""} — ${STATE_LABEL[state] || STATE_LABEL.clean}`.trim()}
      className={`absolute -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-lg ${roomTransitionClassName(state)}`}
      style={{
        left: x,
        top: y,
        width: 30,
        height: 30,
        backgroundColor: palette.fill,
        border: `${RETRO_STROKE_WIDTH} solid ${palette.stroke}`,
        filter: RETRO_SHADOW,
      }}
    >
      <span aria-hidden="true" className="-rotate-45 flex h-full w-full items-center justify-center gap-0.5 text-[8px]">
        {props.map((prop, index) => (
          <span key={index}>{prop}</span>
        ))}
      </span>
    </div>
  );
}
