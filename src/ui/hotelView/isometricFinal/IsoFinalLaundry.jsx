import { tileToScreen } from "../engine/IsoProjection";
import { ISO_FINAL_PROJECTION } from "./IsoFinalGrid";
import { PALETTE, STROKE_WIDTH, SHADOW_FILTER } from "./IsoFinalStyle";
import { LAUNDRY_PROPS } from "./IsoFinalSprites";
import "./isoFinalView.css";

// Ground-floor room: laundry -- machines, paniers (see IsoFinalSprites.js's
// LAUNDRY_PROPS). Also the back-of-house block that pulses when
// `hasIncident` is true, same "surfaced on the hotel itself" idea every
// earlier view's back-office block had.
export default function IsoFinalLaundry({ col, row, hasIncident = false }) {
  const { x, y } = tileToScreen({ col, row }, ISO_FINAL_PROJECTION);
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: x, top: y }}>
      <div
        className="mx-auto flex h-12 w-14 flex-wrap items-center justify-center gap-0.5 rounded-2xl text-sm"
        style={{ backgroundColor: `${PALETTE.mintGreen}33`, border: `${STROKE_WIDTH} solid ${PALETTE.nightBlue}`, filter: SHADOW_FILTER }}
      >
        {LAUNDRY_PROPS.map((prop, index) => (
          <span key={index} aria-hidden="true">{prop}</span>
        ))}
      </div>
      <span className="mt-1 block text-[10px] font-bold" style={{ color: PALETTE.nightBlue }}>Laundry</span>
      {hasIncident && (
        <span aria-hidden="true" className="if-incident-pulse mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]" style={{ backgroundColor: "#fde2e2" }}>
          ❗
        </span>
      )}
    </div>
  );
}
