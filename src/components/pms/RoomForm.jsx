import Button from "../ui/Button";
import Input from "../ui/Input";
import { ROOM_STATUSES, ROOM_TYPES, createRoom } from "../../lib/pmsModels";

const selectClass = "rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100";

export default function RoomForm({ room, onSave, onCancel }) {
  const initial = createRoom(room || {});

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave(createRoom({
      ...initial,
      number: form.get("number"),
      type: form.get("type"),
      price: form.get("price"),
      status: form.get("status"),
      floor: form.get("floor"),
      capacity: form.get("capacity"),
      housekeeping_status: form.get("housekeeping_status"),
      maintenance_notes: form.get("maintenance_notes"),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-5">
      <h2 className="mb-4 text-base font-semibold text-slate-900">{initial.id ? "Edit room" : "Add room"}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Number" name="number" required defaultValue={initial.number} />
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">Type
          <select name="type" defaultValue={initial.type} className={selectClass}>
            {ROOM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <Input label="Price / night" name="price" type="number" min="0" step="0.01" defaultValue={initial.price} />
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">Status
          <select name="status" defaultValue={initial.status} className={selectClass}>
            {ROOM_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <Input label="Floor" name="floor" type="number" defaultValue={initial.floor ?? ""} />
        <Input label="Capacity" name="capacity" type="number" min="1" defaultValue={initial.capacity} />
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">Housekeeping
          <select name="housekeeping_status" defaultValue={initial.housekeeping_status} className={selectClass}>
            <option value="clean">clean</option>
            <option value="dirty">dirty</option>
            <option value="in-progress">in-progress</option>
          </select>
        </label>
      </div>
      <label className="mt-4 flex flex-col gap-1 text-sm font-semibold text-slate-700">Maintenance notes
        <textarea name="maintenance_notes" rows="2" defaultValue={initial.maintenance_notes} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition-shadow focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100" />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
        <Button type="submit">Save room</Button>
      </div>
    </form>
  );
}
