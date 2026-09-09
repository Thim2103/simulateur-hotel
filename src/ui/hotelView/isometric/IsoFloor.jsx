import { toIso } from "./IsoGrid";
import IsoRoom from "./IsoRoom";

// One isometric floor: a row of IsoRoom tiles (one column each) at a
// fixed grid `row`, plus a small floor-number label anchored at the row's
// own starting tile.
export default function IsoFloor({ level, row, rooms }) {
  const labelPos = toIso(-1, row);
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500"
        style={{ left: labelPos.x, top: labelPos.y }}
      >
        Étage {level}
      </div>
      {rooms.map((room, index) => (
        <IsoRoom key={room.id} col={index} row={row} state={room.state} number={room.number} />
      ))}
    </>
  );
}
