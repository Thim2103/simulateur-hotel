import { toIsoRetro } from "./RetroGrid";
import { RETRO_PALETTE, RETRO_SHADOW, RETRO_STROKE_WIDTH } from "./RetroStyle";
import { RETRO_RECEPTION_PROPS } from "./RetroSprites";

// Ground-floor block: réception -- desk, computer, plant (see
// RetroSprites.js's RETRO_RECEPTION_PROPS), rounded pastel block with a
// crisp drop shadow.
export default function RetroReception({ col, row }) {
  const { x, y } = toIsoRetro(col, row);
  const palette = RETRO_PALETTE.pink;
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: x, top: y }}>
      <div
        className="mx-auto flex h-12 w-12 items-center justify-center gap-0.5 rounded-2xl text-sm"
        style={{ backgroundColor: palette.soft, border: `${RETRO_STROKE_WIDTH} solid ${palette.stroke}`, filter: RETRO_SHADOW }}
      >
        {RETRO_RECEPTION_PROPS.map((prop, index) => (
          <span key={index} aria-hidden="true">{prop}</span>
        ))}
      </div>
      <span className="mt-1 block text-[10px] font-bold text-[#3f3a52]">Réception</span>
    </div>
  );
}
