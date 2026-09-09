import { tileToScreen } from "../engine/IsoProjection";
import { ISO_FINAL_PROJECTION } from "./IsoFinalGrid";
import IsoFinalRoom from "./IsoFinalRoom";
import { PALETTE } from "./IsoFinalStyle";

// One floor: a row of IsoFinalRoom tiles, plus a small pastel floor label
// -- "escaliers visibles" between floors is implied by the label sitting
// just past each row's own first tile, marking the transition.
export default function IsoFinalFloor({ level, row, rooms }) {
  const labelPos = tileToScreen({ col: -1, row }, ISO_FINAL_PROJECTION);
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
        style={{ left: labelPos.x, top: labelPos.y, backgroundColor: PALETTE.nightBlue }}
      >
        Étage {level}
      </div>
      {rooms.map((room, index) => (
        <IsoFinalRoom key={room.id} col={index} row={row} state={room.state} number={room.number} />
      ))}
    </>
  );
}
