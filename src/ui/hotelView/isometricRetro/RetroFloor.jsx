import { toIsoRetro } from "./RetroGrid";
import RetroRoom from "./RetroRoom";

// One retro-modern floor: a row of RetroRoom tiles at a fixed grid `row`,
// plus a small, friendly floor-number label.
export default function RetroFloor({ level, row, rooms }) {
  const labelPos = toIsoRetro(-1, row);
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#3f3a52] shadow-sm"
        style={{ left: labelPos.x, top: labelPos.y }}
      >
        Étage {level}
      </div>
      {rooms.map((room, index) => (
        <RetroRoom key={room.id} col={index} row={row} state={room.state} number={room.number} />
      ))}
    </>
  );
}
