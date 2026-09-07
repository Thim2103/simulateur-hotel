import { useMemo, useState } from "react";
import PMSReservationBlock from "./PMSReservationBlock";
import { findReservationConflicts } from "../../lib/pmsModels";

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const EMPTY_ROOMS = [];
const EMPTY_RESERVATIONS = [];

function toDateString(date) {
  return new Date(date).toISOString().split("T")[0];
}

export default function PMSGrid({ rooms = [], reservations = [], filters = {}, onReservationMove, onReservationConflict, onSelectReservation }) {
  const filteredRooms = useMemo(
    () => {
      const safeRooms = Array.isArray(rooms) ? rooms : EMPTY_ROOMS;
      return safeRooms.filter((room) =>
        filters.roomType ? String(room.type || "").toLowerCase() === String(filters.roomType).toLowerCase() : true
      );
    },
    [rooms, filters.roomType]
  );

  const filteredReservations = useMemo(
    () => {
      const safeReservations = Array.isArray(reservations) ? reservations : EMPTY_RESERVATIONS;
      return safeReservations.filter((res) =>
        filters.status ? String(res.status || "").toLowerCase() === String(filters.status).toLowerCase() : true
      );
    },
    [reservations, filters.status]
  );

  const days = Array.from({ length: 14 }).map((_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return toDateString(date);
  });

  const [draggedId, setDraggedId] = useState(null);
  const [dragMode, setDragMode] = useState("move");

  const reserveForDay = (roomId, day) =>
    filteredReservations.find(
      (reservation) =>
        Number(reservation.room_id ?? reservation.roomId ?? reservation.room ?? 0) === Number(roomId) &&
        day >= String(reservation.arrival || "").slice(0, 10) &&
        day < String(reservation.departure || "").slice(0, 10)
    );

  const handleDrop = (roomId, day) => {
    if (!draggedId) return;

    const safeReservations = Array.isArray(reservations) ? reservations : EMPTY_RESERVATIONS;
    const reservation = safeReservations.find((item) => Number(item.id) === Number(draggedId));
    if (!reservation) return;

    const currentArrival = new Date(`${reservation.arrival}T12:00:00`);
    const currentDeparture = new Date(`${reservation.departure}T12:00:00`);
    const targetDate = new Date(`${day}T12:00:00`);

    let nextReservation;

    if (dragMode === "resize") {
      const nextDeparture = targetDate > currentArrival ? targetDate : new Date(currentArrival.getTime() + DAY_IN_MS);
      nextReservation = {
        ...reservation,
        departure: toDateString(nextDeparture),
      };
    } else {
      const stayLength = (currentDeparture - currentArrival) / DAY_IN_MS;
      const nextArrival = new Date(targetDate);
      const nextDeparture = new Date(targetDate);
      nextDeparture.setDate(nextDeparture.getDate() + Math.max(1, stayLength));

      nextReservation = {
        ...reservation,
        room_id: Number(roomId),
        room_type: reservation.room_type || "standard",
        arrival: toDateString(nextArrival),
        departure: toDateString(nextDeparture),
      };
    }

    const conflicts = findReservationConflicts(safeReservations, nextReservation);
    if (conflicts.length) {
      onReservationConflict?.({ reservation: nextReservation, conflicts });
      setDraggedId(null);
      setDragMode("move");
      return;
    }

    if (typeof onReservationMove === "function") onReservationMove(nextReservation);
    setDraggedId(null);
    setDragMode("move");
  };

  return (
    <div className="overflow-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-slate-200 bg-slate-100 p-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Room</th>
            {days.map((day) => (
              <th key={day} className="border border-slate-200 bg-slate-50 p-2 text-xs font-medium text-slate-500">
                {day}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filteredRooms.length === 0 ? (
            <tr><td colSpan={days.length + 1} className="px-4 py-12 text-center text-sm text-slate-500">Aucune chambre ne correspond aux filtres sélectionnés.</td></tr>
          ) : filteredRooms.map((room) => (
            <tr key={room.id} className="border border-slate-200 transition-colors duration-150 hover:bg-cyan-50/30">
              <td className="border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900">
                {room.number || room.name || `Room ${room.id}`}
              </td>

              {days.map((day) => {
                const reservation = reserveForDay(room.id, day);

                return (
                  <td
                    key={`${room.id}-${day}`}
                    className="relative h-12 border border-slate-200 bg-white p-0"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(room.id, day)}
                  >
                    {reservation && (
                      <PMSReservationBlock
                        reservation={reservation}
                        onClick={() => onSelectReservation?.(reservation)}
                        draggable
                        onDragStart={() => { setDraggedId(Number(reservation.id)); setDragMode("move"); }}
                        onDragEnd={() => { setDraggedId(null); setDragMode("move"); }}
                        onResizeStart={() => { setDraggedId(Number(reservation.id)); setDragMode("resize"); }}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
