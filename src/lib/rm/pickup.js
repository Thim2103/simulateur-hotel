// Booking pace (pick-up): how many reservations were *created* each day,
// both overall and broken down by segment/channel. Reuses lib/calculs/rm.js
// for the overall daily series; the segment/channel breakdown needs its own
// (small, local) classification since rm.js doesn't export its internal
// reservationSegment()/reservationChannel() helpers.
import { pickup as dailyPickup, pickupCurve } from "../calculs/rm";

function reservationSegment(reservation) {
  const value = String(reservation?.segment || reservation?.market_segment || "").toLowerCase();
  if (value.includes("corpor") || value.includes("business")) return "corporate";
  if (value.includes("ota") || value.includes("online")) return "ota";
  if (value.includes("group")) return "groups";
  return "leisure";
}

function reservationChannel(reservation) {
  const value = String(reservation?.channel || reservation?.source || "").toLowerCase();
  if (value.includes("ota") || value.includes("booking") || value.includes("expedia")) return "ota";
  if (value.includes("corpor")) return "corporate";
  if (value.includes("agency") || value.includes("agence")) return "agency";
  return "direct";
}

// Returns { [group]: { [date]: count } }, mirroring pickup()'s own
// { [date]: count } shape per group.
function pickupByGroup(reservations, classify) {
  const groups = {};
  reservations.forEach((reservation) => {
    if (!reservation.created_at) return;
    const day = String(reservation.created_at).slice(0, 10);
    const key = classify(reservation);
    groups[key] = groups[key] || {};
    groups[key][day] = (groups[key][day] || 0) + 1;
  });
  return groups;
}

export function runPickup({ reservations = [] } = {}) {
  const safeReservations = Array.isArray(reservations) ? reservations : [];

  return {
    daily: dailyPickup(safeReservations),
    curve: pickupCurve(safeReservations),
    bySegment: pickupByGroup(safeReservations, reservationSegment),
    byChannel: pickupByGroup(safeReservations, reservationChannel),
  };
}
