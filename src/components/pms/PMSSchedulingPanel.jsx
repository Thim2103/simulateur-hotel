import { useEffect } from "react";

export default function PMSSchedulingPanel({ events = [], onEventsVisible }) {
  const defaultEvents = [
    { id: 1, title: 'Board meeting', room: 'Seminar 1', date: '2026-09-08', start: '09:00', end: '11:00' },
    { id: 2, title: 'Regional workshop', room: 'Conference Hall', date: '2026-09-08', start: '13:00', end: '16:00' },
    { id: 3, title: 'Investor briefing', room: 'Seminar 2', date: '2026-09-09', start: '10:30', end: '12:00' },
  ];

  const list = events.length ? events : defaultEvents;

  useEffect(() => {
    onEventsVisible?.(list);
  }, [list, onEventsVisible]);

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Seminar & conference</h2>
        <p className="text-sm text-gray-500">Shared facilities scheduling</p>
      </div>

      <div className="space-y-3">
        {list.map((event) => (
          <div key={event.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{event.title}</div>
              <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700">{event.room}</span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {event.date} · {event.start} - {event.end}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
