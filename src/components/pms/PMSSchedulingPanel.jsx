import { useEffect, useState } from "react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import {
  SCHEDULING_ROOM_TYPES,
  createSchedulingEvent,
  exceedsCapacity,
  findSchedulingConflicts,
} from "../../lib/pmsScheduling";

const DEFAULT_EVENTS = [
  { id: 1, title: "Board meeting", room: "Seminar 1", date: "2026-09-08", start: "09:00", end: "11:00", attendees: 8 },
  { id: 2, title: "Regional workshop", room: "Conference Hall", date: "2026-09-08", start: "13:00", end: "16:00", attendees: 30 },
  { id: 3, title: "Investor briefing", room: "Seminar 2", date: "2026-09-09", start: "10:30", end: "12:00", attendees: 10 },
];

export default function PMSSchedulingPanel({ rooms = [], events, onEventsVisible }) {
  const [localEvents, setLocalEvents] = useState(events && events.length ? events : DEFAULT_EVENTS);
  const [error, setError] = useState(null);

  const schedulingRooms = rooms.filter((room) => SCHEDULING_ROOM_TYPES.includes(String(room.type || "").toLowerCase()));
  const roomOptions = schedulingRooms.length
    ? schedulingRooms
    : [{ id: "seminar-1", number: "Seminar 1", capacity: 12 }, { id: "conference-hall", number: "Conference Hall", capacity: 60 }];

  useEffect(() => {
    onEventsVisible?.(localEvents);
  }, [localEvents, onEventsVisible]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roomName = String(form.get("room") || "");
    const selectedRoom = roomOptions.find((room) => (room.number || room.name) === roomName);
    const candidate = createSchedulingEvent({
      id: Date.now(),
      title: form.get("title"),
      room: roomName,
      date: form.get("date"),
      start: form.get("start"),
      end: form.get("end"),
      attendees: form.get("attendees"),
    });

    if (exceedsCapacity(selectedRoom, candidate.attendees)) {
      setError(`${roomName} capacity is ${selectedRoom.capacity}, but ${candidate.attendees} attendees were requested.`);
      return;
    }

    const conflicts = findSchedulingConflicts(localEvents, candidate);
    if (conflicts.length) {
      setError(`Schedule conflict with "${conflicts[0].title}" in ${roomName} (${conflicts[0].start}-${conflicts[0].end}).`);
      return;
    }

    setError(null);
    setLocalEvents((current) => [...current, candidate]);
    event.currentTarget.reset();
  };

  const removeEvent = (id) => {
    setLocalEvents((current) => current.filter((item) => item.id !== id));
  };

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Seminar &amp; conference</h2>
        <p className="text-sm text-slate-500">Capacity rules and schedule conflict checks</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-4 grid gap-2 sm:grid-cols-2">
        <Input label="Title" name="title" required placeholder="Meeting title" />
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-700">Room
          <select name="room" required className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-100">
            {roomOptions.map((room) => {
              const name = room.number || room.name;
              return <option key={room.id} value={name}>{name} · {room.capacity} pax</option>;
            })}
          </select>
        </label>
        <Input label="Date" name="date" type="date" required />
        <Input label="Attendees" name="attendees" type="number" min="1" required />
        <Input label="Start" name="start" type="time" required defaultValue="09:00" />
        <Input label="End" name="end" type="time" required defaultValue="10:00" />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit">Book room</Button>
        </div>
      </form>

      {error && <p className="mb-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}

      <div className="space-y-3">
        {localEvents.map((event) => (
          <div key={event.id} className="rounded-lg border border-slate-200 p-3 transition-colors duration-150 hover:border-slate-300">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-slate-900">{event.title}</div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs text-cyan-700">{event.room}</span>
                <button type="button" onClick={() => removeEvent(event.id)} className="text-xs font-medium text-rose-600 transition-colors duration-150 hover:text-rose-700 hover:underline">Remove</button>
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-500">
              {event.date} · {event.start} - {event.end} · {event.attendees} attendees
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
