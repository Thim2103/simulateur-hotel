import { toIsoFinal } from "./IsoFinalGrid";
import { PALETTE, STROKE_WIDTH, SHADOW_FILTER } from "./IsoFinalStyle";
import { HALL_PROPS } from "./IsoFinalSprites";

// Ground-floor room: hall -- canapé, décorations, ascenseur stylisé (see
// IsoFinalSprites.js's HALL_PROPS).
export default function IsoFinalHall({ col, row }) {
  const { x, y } = toIsoFinal(col, row);
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: x, top: y }}>
      <div
        className="mx-auto flex h-12 w-14 flex-wrap items-center justify-center gap-0.5 rounded-2xl text-sm"
        style={{ backgroundColor: `${PALETTE.glacierBlue}33`, border: `${STROKE_WIDTH} solid ${PALETTE.nightBlue}`, filter: SHADOW_FILTER }}
      >
        {HALL_PROPS.map((prop, index) => (
          <span key={index} aria-hidden="true">{prop}</span>
        ))}
      </div>
      <span className="mt-1 block text-[10px] font-bold" style={{ color: PALETTE.nightBlue }}>Hall</span>
    </div>
  );
}
