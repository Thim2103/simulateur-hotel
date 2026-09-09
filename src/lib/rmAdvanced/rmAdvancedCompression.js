// Compression -- how full the hotel is on each upcoming date (occupied
// rooms / total capacity), the core RM concept every other Advanced RM
// computation (displacement, special pricing) builds on. Flags
// surbooking-risk dates (near-full) and under-occupancy dates (needing
// stimulation) so the diagnostics/actions layers can react to them.
import { safeArray, safeNumber } from "../safe";

const HIGH_COMPRESSION_THRESHOLD = 90;
const LOW_OCCUPANCY_THRESHOLD = 35;

function isConfirmed(reservation) {
  const status = String(reservation?.status || "").toLowerCase();
  return status.includes("confirm") || status.includes("occupied") || status === "booked";
}

function toDateOnly(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function roomIdOf(reservation) {
  return String(reservation?.room_id ?? reservation?.roomId ?? reservation?.room_number ?? reservation?.room ?? reservation?.id ?? "unknown");
}

function levelFor(occupancyRate) {
  if (occupancyRate >= HIGH_COMPRESSION_THRESHOLD) return "high";
  if (occupancyRate <= LOW_OCCUPANCY_THRESHOLD) return "low";
  return "normal";
}

// options:
//   rooms: the PMS state's rooms array.
//   reservations: the PMS state's reservations array.
//   referenceDate: the simulated "today" -- the compression window starts here.
//   horizonDays: how many upcoming days to compute compression for.
export function computeCompression({ rooms = [], reservations = [], referenceDate = new Date(), horizonDays = 14 } = {}) {
  const safeRooms = safeArray(rooms, []);
  const safeReservations = safeArray(reservations, []).filter(isConfirmed);
  const totalRooms = safeRooms.length;

  const byDate = [];
  for (let offset = 0; offset < horizonDays; offset += 1) {
    const date = new Date(referenceDate);
    date.setDate(date.getDate() + offset);
    const dateKey = toDateOnly(date);

    const occupiedRoomIds = new Set();
    safeReservations.forEach((reservation) => {
      const arrival = reservation.arrival ? toDateOnly(reservation.arrival) : null;
      const departure = reservation.departure ? toDateOnly(reservation.departure) : null;
      if (!arrival || !departure) return;
      if (dateKey >= arrival && dateKey < departure) occupiedRoomIds.add(roomIdOf(reservation));
    });

    const occupancyRate = totalRooms ? Math.round(Math.min(100, (occupiedRoomIds.size / totalRooms) * 100)) : 0;
    byDate.push({ date: dateKey, occupancyRate, occupiedRooms: occupiedRoomIds.size, totalRooms, level: levelFor(occupancyRate) });
  }

  const avgCompression = byDate.length
    ? Math.round(byDate.reduce((sum, entry) => sum + safeNumber(entry.occupancyRate, 0), 0) / byDate.length)
    : null;

  return {
    byDate,
    avgCompression,
    highCompressionDates: byDate.filter((entry) => entry.level === "high").map((entry) => entry.date),
    lowOccupancyDates: byDate.filter((entry) => entry.level === "low").map((entry) => entry.date),
  };
}
