import PMSReservationBlock from "./PMSReservationBlock";

export default function PMSGrid({ rooms, reservations, filters }) {
  // Filtrage
  const filteredRooms = rooms.filter((room) =>
    filters.roomType ? room.type === filters.roomType : true
  );

  const filteredReservations = reservations.filter((res) =>
    filters.status ? res.status === filters.status : true
  );

  // Générer les 14 prochains jours
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  return (
    <div className="overflow-auto border rounded-xl bg-white">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 border bg-gray-100">Chambre</th>
            {days.map((d) => (
              <th key={d} className="p-2 border text-sm bg-gray-50">
                {d}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filteredRooms.map((room) => (
            <tr key={room.id} className="border">
              <td className="p-2 border font-semibold bg-gray-50">
                {room.number}
              </td>

              {days.map((day) => {
                const res = filteredReservations.find(
                  (r) =>
                    r.room_id === room.id &&
                    day >= r.arrival &&
                    day < r.departure
                );

                return (
                  <td key={day} className="p-0 border relative h-10">
                    {res && <PMSReservationBlock reservation={res} />}
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
