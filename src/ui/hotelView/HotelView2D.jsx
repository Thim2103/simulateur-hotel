import Floor from "./Floor";
import Reception from "./Reception";
import Restaurant from "./Restaurant";
import BackOffice from "./BackOffice";
import { fadeIn } from "../animations";

const FLOOR_COUNT = 4;

// The redesigned "2D stylisée" hotel view -- floors of Room glyphs above a
// ground floor of Reception/Restaurant/BackOffice blocks, each with their
// own small staff/guest/incident glyphs (see ./Room.jsx, ./Floor.jsx,
// ./Reception.jsx, ./Restaurant.jsx, ./BackOffice.jsx, ./StaffIcon.jsx,
// ./GuestIcon.jsx, ./IncidentIcon.jsx). Version 1 (this component) is
// still icon-based per the spec, but componentised and CSS-animated
// (v2: "animations simples") rather than the single flat grid the
// previous components/dashboard/HotelView.jsx drew (removed -- this
// replaces it everywhere, see pages/Dashboard.jsx).
export default function HotelView2D({ roomCount = 0, occupancyRate = 0, hasIncident = false }) {
  const totalRooms = Math.max(roomCount, 0);
  const occupiedCount = Math.round((totalRooms * (occupancyRate || 0)) / 100);
  const roomsPerFloor = Math.max(1, Math.ceil(totalRooms / FLOOR_COUNT));
  const rooms = Array.from({ length: totalRooms }, (_, i) => i < occupiedCount);

  const floors = Array.from({ length: FLOOR_COUNT }, (_, floorIndex) => ({
    level: FLOOR_COUNT - floorIndex,
    rooms: rooms.slice(floorIndex * roomsPerFloor, (floorIndex + 1) * roomsPerFloor),
  })).filter((floor) => floor.rooms.length > 0);

  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 ${fadeIn}`}>
      <h2 id="hotel-view-title" className="mb-3 text-sm font-semibold text-slate-900">Vue de l'hôtel</h2>
      {totalRooms === 0 ? (
        <p className="text-sm text-slate-500">Aucune chambre configurée.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {floors.map((floor) => (
            <Floor key={floor.level} level={floor.level} rooms={floor.rooms} />
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
        <Reception guestCount={occupiedCount} />
        <Restaurant />
        <BackOffice hasIncident={hasIncident} />
      </div>
    </div>
  );
}
