const FLOOR_COUNT = 4;

// A stylised "view of the hotel" -- floors of rooms (colored by
// occupancy), reception/restaurant at ground level, back-office
// (housekeeping/staff) below. Icon grid for now, as the spec allows
// ("même si dans un premier temps c'est une grille d'icônes"); the shape
// (floors/ground floor/back-office) is what would later become an actual
// 2D rendering.
function RoomIcon({ occupied }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 rounded-sm border ${occupied ? "border-cyan-700 bg-cyan-500" : "border-slate-300 bg-slate-100"}`}
      title={occupied ? "Chambre occupée" : "Chambre libre"}
    />
  );
}

export default function HotelView({ roomCount = 0, occupancyRate = 0 }) {
  const totalRooms = Math.max(roomCount, 0);
  const occupiedCount = Math.round((totalRooms * (occupancyRate || 0)) / 100);
  const roomsPerFloor = Math.max(1, Math.ceil(totalRooms / FLOOR_COUNT));

  const rooms = Array.from({ length: totalRooms }, (_, i) => i < occupiedCount);

  return (
    <section aria-labelledby="hotel-view-title" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 id="hotel-view-title" className="mb-3 text-sm font-semibold text-slate-900">Vue de l'hôtel</h2>

      {totalRooms === 0 ? (
        <p className="text-sm text-slate-500">Aucune chambre configurée.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {Array.from({ length: FLOOR_COUNT }, (_, floorIndex) => {
            const floorRooms = rooms.slice(floorIndex * roomsPerFloor, (floorIndex + 1) * roomsPerFloor);
            if (floorRooms.length === 0) return null;
            return (
              <div key={floorIndex} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs font-medium text-slate-500">Étage {FLOOR_COUNT - floorIndex}</span>
                <div className="flex flex-wrap gap-1">
                  {floorRooms.map((occupied, roomIndex) => (
                    <RoomIcon key={roomIndex} occupied={occupied} />
                  ))}
                </div>
              </div>
            );
          }).reverse()}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 sm:grid-cols-4">
        <span className="rounded-md bg-slate-50 px-2 py-1">🛎️ Réception</span>
        <span className="rounded-md bg-slate-50 px-2 py-1">🍽️ Restaurant</span>
        <span className="rounded-md bg-slate-50 px-2 py-1">🧹 Housekeeping</span>
        <span className="rounded-md bg-slate-50 px-2 py-1">👔 Back-office</span>
      </div>
    </section>
  );
}
