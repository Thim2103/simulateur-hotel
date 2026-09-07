// Daily reservation lifecycle: confirmed stays arriving today check in
// (their room becomes occupied), stays departing today check out (their
// room is freed and flagged for housekeeping, mirroring housekeeping.js's
// applyTurnover()), and stays that never got confirmed by their arrival
// date are marked as no-shows.
function toDateOnly(value) {
  return String(value || "").slice(0, 10);
}

function isCancelled(status) {
  return String(status || "").toLowerCase().includes("annul");
}

function isConfirmed(status) {
  const value = String(status || "").toLowerCase();
  return value.includes("confirm") || value === "booked";
}

function isPending(status) {
  const value = String(status || "").toLowerCase();
  return !isCancelled(value) && !isConfirmed(value);
}

// rooms/reservations: the PMS state (see pmsRepository.js). referenceDate:
// the simulated "today". Returns the updated rooms/reservations plus a
// `changes` summary of what happened, and the ids that actually changed so
// the caller only needs to persist those rows.
export function updateReservations({ rooms = [], reservations = [], referenceDate = new Date() } = {}) {
  const today = toDateOnly(referenceDate.toISOString ? referenceDate.toISOString() : referenceDate);
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const safeReservations = Array.isArray(reservations) ? reservations : [];

  const checkIns = [];
  const checkOuts = [];
  const noShows = [];
  const changedRoomIds = new Set();
  const changedReservationIds = new Set();
  const roomStatusById = new Map();

  const nextReservations = safeReservations.map((reservation) => {
    if (isCancelled(reservation.status)) return reservation;

    const arrival = toDateOnly(reservation.arrival);
    const departure = toDateOnly(reservation.departure);
    const roomId = reservation.room_id ?? reservation.roomId;

    // No-show: arrival date has passed and the stay was never confirmed.
    if (isPending(reservation.status) && arrival && arrival < today) {
      noShows.push({ id: reservation.id, client: reservation.client_name || reservation.client, roomId });
      changedReservationIds.add(reservation.id);
      return { ...reservation, status: "annulée" };
    }

    // Check-in: confirmed stay starting today.
    if (isConfirmed(reservation.status) && arrival === today) {
      checkIns.push({ id: reservation.id, client: reservation.client_name || reservation.client, roomId });
      if (roomId !== undefined && roomId !== null) roomStatusById.set(Number(roomId), "occupée");
    }

    // Check-out: confirmed stay ending today.
    if (isConfirmed(reservation.status) && departure === today) {
      checkOuts.push({ id: reservation.id, client: reservation.client_name || reservation.client, roomId });
      if (roomId !== undefined && roomId !== null && !roomStatusById.has(Number(roomId))) {
        roomStatusById.set(Number(roomId), "libre");
      }
    }

    return reservation;
  });

  const nextRooms = safeRooms.map((room) => {
    const nextStatus = roomStatusById.get(Number(room.id));
    if (!nextStatus || nextStatus === room.status) return room;

    changedRoomIds.add(room.id);
    // A checkout also leaves the room dirty for housekeeping (see
    // housekeeping.js's applyTurnover(), which this mirrors for same-day
    // consistency without requiring a second round-trip through it).
    const housekeepingStatus = nextStatus === "libre" ? "dirty" : room.housekeeping_status;
    return { ...room, status: nextStatus, housekeeping_status: housekeepingStatus };
  });

  return {
    rooms: nextRooms,
    reservations: nextReservations,
    // Only no-shows mutate the reservation row itself (status -> annulée);
    // check-ins/check-outs only change the room's status/housekeeping, which
    // is reflected in changedRoomIds instead.
    changedRoomIds: Array.from(changedRoomIds),
    changedReservationIds: Array.from(changedReservationIds),
    changes: { checkIns, checkOuts, noShows },
  };
}
