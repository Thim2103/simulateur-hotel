import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";

const selectClass = "rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100";

export default function PMSReservationEditor({ reservation, rooms, onSave }) {
  if (!reservation) {
    return (
      <Card className="border-dashed">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Reservation editor</h2>
        <p className="text-sm text-slate-500">Select a reservation to edit.</p>
      </Card>
    );
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextReservation = {
      ...reservation,
      client_name: String(form.get("client_name") || reservation.client_name || "Guest"),
      room_id: Number(form.get("room_id") || reservation.room_id || rooms[0]?.id || 1),
      room_type: String(form.get("room_type") || reservation.room_type || "standard"),
      status: String(form.get("status") || reservation.status || "confirmée"),
      arrival: String(form.get("arrival") || reservation.arrival || "2026-09-06"),
      departure: String(form.get("departure") || reservation.departure || "2026-09-09"),
      notes: String(form.get("notes") || reservation.notes || ""),
    };

    onSave(nextReservation);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Reservation editor</h2>
        <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-700">
          {reservation.status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Client" name="client_name" defaultValue={reservation.client_name || ""} />
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Room
          <select
            name="room_id"
            defaultValue={reservation.room_id ?? rooms[0]?.id ?? 1}
            className={selectClass}
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.number} · {room.type}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Room type
          <select
            name="room_type"
            defaultValue={reservation.room_type || "standard"}
            className={selectClass}
          >
            <option value="standard">Standard</option>
            <option value="deluxe">Deluxe</option>
            <option value="suite">Suite</option>
            <option value="seminar">Seminar</option>
            <option value="conference">Conference</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Status
          <select
            name="status"
            defaultValue={reservation.status || "confirmée"}
            className={selectClass}
          >
            <option value="confirmée">Confirmée</option>
            <option value="option">Option</option>
            <option value="annulée">Annulée</option>
          </select>
        </label>

        <Input label="Arrival" name="arrival" type="date" defaultValue={reservation.arrival || ""} />
        <Input label="Departure" name="departure" type="date" defaultValue={reservation.departure || ""} />
      </div>

      <div className="mt-4">
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">
          Notes
          <textarea
            name="notes"
            defaultValue={reservation.notes || ""}
            rows={3}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition-shadow focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="submit">Save reservation</Button>
      </div>
    </form>
  );
}
