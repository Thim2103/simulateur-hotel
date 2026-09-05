import { useMemo, useState } from "react";
import PMSReservationBlock from "./PMSReservationBlock";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

function toDateString(date) {
  return new Date(date).toISOString().split("T")[0];
}

export default function PMSGrid({ rooms = [], reservations = [], filters = {}, onReservationMove, onSelectReservation }) {
  const filteredRooms = useMemo(
    () =>
      rooms.filter((room) =>
        filters.roomType ? String(room.type || "").toLowerCase() === String(filters.roomType).toLowerCase() : true
      ),
    [rooms, filters.roomType]
  );

  const filteredReservations = useMemo(
    () =>
      reservations.filter((res) =>
        filters.status ? String(res.status || "").toLowerCase() === String(filters.status).toLowerCase() : true
      ),
    [reservations, filters.status]
  );

  const days = Array.from({ length: 14 }).map((_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return toDateString(date);
  });

  const [draggedId, setDraggedId] = useState(null);

  const reserveForDay = (roomId, day) =>
    filteredReservations.find(
      (reservation) =>
        Number(reservation.room_id ?? reservation.roomId ?? reservation.room ?? 0) === Number(roomId) &&
        day >= String(reservation.arrival || "").slice(0, 10) &&
        day < String(reservation.departure || "").slice(0, 10)
    );

  const handleDrop = (roomId, day) => {
    if (!draggedId) return;

    const reservation = reservations.find((item) => Number(item.id) === Number(draggedId));
    if (!reservation) return;

    const currentArrival = new Date(`${reservation.arrival}T12:00:00`);
    const currentDeparture = new Date(`${reservation.departure}T12:00:00`);
    const targetDate = new Date(`${day}T12:00:00`);
    const stayLength = (currentDeparture - currentArrival) / DAY_IN_MS;
    const nextArrival = new Date(targetDate);
    const nextDeparture = new Date(targetDate);
    nextDeparture.setDate(nextDeparture.getDate() + Math.max(1, stayLength));

    const nextReservation = {
      ...reservation,
      room_id: Number(roomId),
      room_type: reservation.room_type || "standard",
      arrival: toDateString(nextArrival),
      departure: toDateString(nextDeparture),
    };

    if (typeof onReservationMove === "function") onReservationMove(nextReservation);
    setDraggedId(null);
  };

  return (
    <div className="overflow-auto rounded-xl border bg-white">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="border bg-gray-100 p-2">Room</th>
            {days.map((day) => (
              <th key={day} className="border bg-gray-50 p-2 text-xs">
                {day}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filteredRooms.map((room) => (
            <tr key={room.id} className="border">
              <td className="border bg-gray-50 p-2 font-semibold">
                {room.number || room.name || `Room ${room.id}`}
              </td>

              {days.map((day) => {
                const reservation = reserveForDay(room.id, day);

                return (
                  <td
                    key={`${room.id}-${day}`}
                    className="relative h-12 border bg-white p-0"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(room.id, day)}
                  >
                    {reservation && (
                      <PMSReservationBlock
                        reservation={reservation}
                        onClick={() => onSelectReservation?.(reservation)}
                        draggable
                        onDragStart={() => setDraggedId(Number(reservation.id))}
                        onDragEnd={() => setDraggedId(null)}
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
