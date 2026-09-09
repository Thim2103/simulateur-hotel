import { toIsoRetro } from "./RetroGrid";
import { RETRO_PALETTE, RETRO_SHADOW, RETRO_STROKE_WIDTH } from "./RetroStyle";
import { RETRO_BACKOFFICE_PROPS } from "./RetroSprites";
import "./retroView.css";

// Ground-floor block: back-office -- housekeeping carts, shelves,
// products (see RetroSprites.js's RETRO_BACKOFFICE_PROPS). Pulses when
// `hasIncident` is true, same "surfaced on the hotel itself" idea as v2/
// v3's own BackOffice components.
export default function RetroBackOffice({ col, row, hasIncident = false }) {
  const { x, y } = toIsoRetro(col, row);
  const palette = RETRO_PALETTE.green;
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: x, top: y }}>
      <div
        className="mx-auto flex h-12 w-12 items-center justify-center gap-0.5 rounded-2xl text-sm"
        style={{ backgroundColor: palette.soft, border: `${RETRO_STROKE_WIDTH} solid ${palette.stroke}`, filter: RETRO_SHADOW }}
      >
        {RETRO_BACKOFFICE_PROPS.map((prop, index) => (
          <span key={index} aria-hidden="true">{prop}</span>
        ))}
      </div>
      <span className="mt-1 block text-[10px] font-bold text-[#3f3a52]">Back-office</span>
      {hasIncident && (
        <span aria-hidden="true" className="retro-incident-pulse mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fce7f3] text-[10px]">
          ❗
        </span>
      )}
    </div>
  );
}
