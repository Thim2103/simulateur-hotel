import Button from "../ui/Button";
import Input from "../ui/Input";
import { RESERVATION_STATUSES, ROOM_TYPES, createReservation } from "../../lib/pmsModels";

const selectClass = "rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100";

export default function ReservationForm({ reservation, rooms = [], onSave, onCancel }) {
  const initial = createReservation(reservation || {});

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roomId = form.get("room_id");
    const selectedRoom = rooms.find((room) => String(room.id) === String(roomId));
    onSave(createReservation({
      ...initial,
      client_id: form.get("client_id") || initial.client_id,
      client_name: form.get("client_name"),
      client_email: form.get("client_email"),
      client_phone: form.get("client_phone"),
      room_id: roomId,
      room: selectedRoom?.number || form.get("room"),
      room_type: form.get("room_type"),
      arrival: form.get("arrival"),
      departure: form.get("departure"),
      status: form.get("status"),
      price: form.get("price"),
      source: form.get("source"),
      segment: form.get("segment"),
      notes: form.get("notes"),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-5">
      <h2 className="mb-4 text-base font-semibold text-slate-900">{initial.id ? "Edit reservation" : "New reservation"}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Client name" name="client_name" required defaultValue={initial.client_name} />
        <Input label="Client ID" name="client_id" defaultValue={initial.client_id ?? ""} placeholder="Supabase client UUID" />
        <Input label="Email" name="client_email" type="email" defaultValue={initial.client_email} />
        <Input label="Phone" name="client_phone" defaultValue={initial.client_phone} />
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">Room
          <select name="room_id" required defaultValue={initial.room_id ?? ""} className={selectClass}>
            <option value="">Select a room</option>
            {rooms.map((room) => <option key={room.id} value={room.id}>{room.number} · {room.type}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">Room type
          <select name="room_type" defaultValue={initial.room_type} className={selectClass}>
            {ROOM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <Input label="Arrival" name="arrival" type="date" required defaultValue={initial.arrival} />
        <Input label="Departure" name="departure" type="date" required defaultValue={initial.departure} />
        <Input label="Price / night" name="price" type="number" min="0" step="0.01" defaultValue={initial.price} />
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">Status
          <select name="status" defaultValue={initial.status} className={selectClass}>
            {RESERVATION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <Input label="Source" name="source" defaultValue={initial.source} placeholder="direct, OTA, agency" />
        <Input label="Segment" name="segment" defaultValue={initial.segment} placeholder="leisure, corporate, groups" />
      </div>
      <label className="mt-4 flex flex-col gap-1 text-sm font-semibold text-slate-700">Notes
        <textarea name="notes" rows="3" defaultValue={initial.notes} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition-shadow focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100" />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
        <Button type="submit">Save reservation</Button>
      </div>
    </form>
  );
}
