import { toIso } from "./IsoGrid";
import { isoRoomSprite } from "./IsoSprites";

const STATE_LABEL = { clean: "propre", dirty: "sale", occupied: "occupée", cleaning: "en nettoyage" };
const STATE_CLASS = {
  clean: "iso-room-clean border-cyan-300 bg-cyan-100",
  dirty: "iso-room-dirty border-slate-300 bg-slate-200",
  occupied: "iso-room-occupied border-amber-400 bg-amber-200",
  cleaning: "iso-room-cleaning border-emerald-400 bg-emerald-200",
};

// One room, drawn as a small isometric "3/4" diamond tile (a rotated
// square, CSS-only, no image asset) positioned at its projected {col,
// row} via IsoGrid.jsx's toIso(). `state` drives both the tile's colour
// and its looping CSS animation (see isoView.css) -- the same 4 states
// HotelRoomsLayer.jsx (v2) shows, transposed to the isometric perspective.
export default function IsoRoom({ col, row, state, number }) {
  const { x, y } = toIso(col, row);
  return (
    <div
      title={`Chambre ${number ?? ""} — ${STATE_LABEL[state] || STATE_LABEL.clean}`.trim()}
      className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 rotate-45 items-center justify-center border-2 ${STATE_CLASS[state] || STATE_CLASS.clean}`}
      style={{ left: x, top: y }}
    >
      <span aria-hidden="true" className="-rotate-45 text-[8px]">{isoRoomSprite(state)}</span>
    </div>
  );
}
