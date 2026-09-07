export const HOUSEKEEPING_STAFF = ["Sophie", "Marc", "Julie", "Lina"];

function toDateOnly(value) {
  return String(value || "").slice(0, 10);
}

function isActiveReservation(reservation) {
  return !String(reservation?.status || "").toLowerCase().includes("annul");
}

// Rooms checked out today are flagged dirty automatically unless already being cleaned.
export function applyTurnover(rooms = [], reservations = [], referenceDate = new Date()) {
  const today = toDateOnly(referenceDate);
  const checkoutRoomIds = new Set(
    (Array.isArray(reservations) ? reservations : [])
      .filter((reservation) => isActiveReservation(reservation) && toDateOnly(reservation.departure) === today)
      .map((reservation) => Number(reservation.room_id ?? reservation.roomId))
  );

  return (Array.isArray(rooms) ? rooms : []).map((room) => {
    if (checkoutRoomIds.has(Number(room.id)) && room.housekeeping_status !== "in-progress" && room.housekeeping_status !== "dirty") {
      return { ...room, housekeeping_status: "dirty" };
    }
    return room;
  });
}

export function turnedOverRooms(originalRooms = [], updatedRooms = []) {
  return updatedRooms.filter((room, index) => room.housekeeping_status !== originalRooms[index]?.housekeeping_status);
}

// Round-robin assignment across the available housekeeping staff.
export function assignStaff(tasks = [], staff = HOUSEKEEPING_STAFF) {
  if (!staff.length) return tasks;
  return tasks.map((task, index) => ({ ...task, assigned: staff[index % staff.length] }));
}

const TASK_LABELS = {
  dirty: "Full clean",
  "in-progress": "Cleaning in progress",
};

export function deriveHousekeepingTasks(rooms = [], reservations = [], staff = HOUSEKEEPING_STAFF, referenceDate = new Date()) {
  const nextRooms = applyTurnover(rooms, reservations, referenceDate);
  const today = toDateOnly(referenceDate);

  const tasks = nextRooms
    .filter((room) => room.housekeeping_status && room.housekeeping_status !== "clean")
    .map((room) => ({
      id: room.id,
      roomId: room.id,
      room: room.number,
      status: room.housekeeping_status,
      task: TASK_LABELS[room.housekeeping_status] || "Inspection",
      dueAt: `${today} 12:00`,
    }));

  return { rooms: nextRooms, tasks: assignStaff(tasks, staff) };
}
