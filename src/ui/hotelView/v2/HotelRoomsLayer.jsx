import { roomDisplayState, roomStateClassName } from "./HotelAnimations";

const STATE_LABEL = { clean: "propre", dirty: "sale", occupied: "occupée", cleaning: "en nettoyage" };

// One room tile. Keyed by `${room.id}-${state}` in HotelRoomsLayer below --
// changing the key remounts the tile, which is what actually replays its
// CSS animation on a state change (fade -> clean, pulse -> dirty, slide ->
// occupied, sweep -> cleaning) without any imperative DOM code; the
// imperative retrigger helpers in HotelAnimations.js are for the ground-
// floor blocks and characters instead, which aren't naturally re-keyed.
function RoomTile({ room, state }) {
  return (
    <span
      title={`Chambre ${room.number ?? room.id} — ${STATE_LABEL[state]}`}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-[4px] border border-black/10 text-[9px] font-semibold text-slate-700 ${roomStateClassName(state)}`}
    />
  );
}

// The rooms layer of HotelView2D v2: every room from careerState.hotel.rooms
// (real fields, see lib/dailyCycle/updateReservations.js -- `status`:
// "libre"/"occupée", `housekeeping_status`: "clean"/"dirty"), grouped into
// 4 floors like v1's HotelView2D, each tile showing one of the 4 visual
// states the spec asks for. `cleaningRoomIds` is transient, local UI state
// (see HotelView2DAnimated.jsx) -- housekeeping decisions flash a room
// green for a few seconds, it's never persisted.
const FLOOR_COUNT = 4;

export default function HotelRoomsLayer({ rooms = [], cleaningRoomIds }) {
  if (rooms.length === 0) {
    return <p className="text-sm text-slate-500">Aucune chambre configurée.</p>;
  }

  const roomsPerFloor = Math.max(1, Math.ceil(rooms.length / FLOOR_COUNT));
  const floors = Array.from({ length: FLOOR_COUNT }, (_, floorIndex) => ({
    level: FLOOR_COUNT - floorIndex,
    rooms: rooms.slice(floorIndex * roomsPerFloor, (floorIndex + 1) * roomsPerFloor),
  })).filter((floor) => floor.rooms.length > 0);

  return (
    <div className="flex flex-col gap-2">
      {floors.map((floor) => (
        <div key={floor.level} className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs font-medium text-slate-500">Étage {floor.level}</span>
          <div className="flex flex-wrap gap-1">
            {floor.rooms.map((room) => {
              const state = roomDisplayState(room, cleaningRoomIds?.has(room.id));
              return <RoomTile key={`${room.id}-${state}`} room={room} state={state} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
