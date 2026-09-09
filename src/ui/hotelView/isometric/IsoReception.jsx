import { toIso } from "./IsoGrid";

// Ground-floor block: réception, drawn as a bigger isometric tile than a
// room (same rotated-square trick as IsoRoom.jsx) at a fixed grid spot.
export default function IsoReception({ col, row }) {
  const { x, y } = toIso(col, row);
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: x, top: y }}>
      <div className="mx-auto flex h-10 w-10 rotate-45 items-center justify-center border-2 border-slate-300 bg-white shadow-sm">
        <span aria-hidden="true" className="-rotate-45 text-sm">🛎️</span>
      </div>
      <span className="mt-1 block text-[10px] font-medium text-slate-600">Réception</span>
    </div>
  );
}
