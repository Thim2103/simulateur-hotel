export const SCHEDULING_ROOM_TYPES = ["seminar", "conference"];

function toMinutes(value) {
  const [hours, minutes] = String(value || "0:0").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function eventsOverlap(a, b) {
  return a.date === b.date && toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

export function findSchedulingConflicts(events = [], candidate) {
  return (Array.isArray(events) ? events : []).filter(
    (event) => Number(event.id) !== Number(candidate.id) && event.room === candidate.room && eventsOverlap(event, candidate)
  );
}

export function exceedsCapacity(room, attendees) {
  if (!room) return false;
  return Number(attendees) > Number(room.capacity || 0);
}

export function createSchedulingEvent(values = {}) {
  return {
    id: values.id ?? Date.now(),
    title: String(values.title || "Meeting"),
    room: String(values.room || ""),
    date: String(values.date || ""),
    start: String(values.start || "09:00"),
    end: String(values.end || "10:00"),
    attendees: Number(values.attendees) || 0,
  };
}
