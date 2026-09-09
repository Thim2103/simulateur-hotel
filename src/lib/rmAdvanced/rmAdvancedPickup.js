// Pick-up curve -- the classic RM booking-pace chart: what share of a
// date's eventual bookings had already come in by each lead-time bucket
// (J-30, J-21, J-14, J-7, J-3, J-1, J-0). A curve front-loaded toward
// J-30 means guests book early (predictable, easier to price); one
// loaded toward J-0 means late, harder-to-forecast demand.
import { safeArray } from "../safe";

const LEAD_TIME_BUCKETS = [30, 21, 14, 7, 3, 1, 0];

function isConfirmed(reservation) {
  const status = String(reservation?.status || "").toLowerCase();
  return status.includes("confirm") || status.includes("occupied") || status === "booked";
}

function leadTimeDays(reservation, referenceDate) {
  if (!reservation.created_at || !reservation.arrival) return null;
  const created = new Date(reservation.created_at);
  const arrival = new Date(reservation.arrival);
  const days = Math.round((arrival - created) / (1000 * 60 * 60 * 24));
  return Number.isFinite(days) && days >= 0 ? days : null;
}

// options:
//   reservations: the PMS state's reservations array.
//   referenceDate: the simulated "today".
export function computePickupCurves({ reservations = [], referenceDate = new Date() } = {}) {
  const safeReservations = safeArray(reservations, []).filter(isConfirmed);
  const leadTimes = safeReservations
    .map((reservation) => leadTimeDays(reservation, referenceDate))
    .filter((value) => value !== null);

  const total = leadTimes.length;
  if (!total) return { curve: [], momentum: null };

  // Cumulative share already booked by the time there were `bucket` days
  // left before arrival (i.e. booked at least that far in advance) --
  // grows from a small % at J-30 to 100% at J-0, the standard pick-up
  // curve shape.
  const curve = LEAD_TIME_BUCKETS.map((bucket) => {
    const bookedByBucket = leadTimes.filter((leadTime) => leadTime >= bucket).length;
    return { leadTimeDays: bucket, bookedPct: Math.round((bookedByBucket / total) * 100) };
  });

  // Momentum: how much of the pace is concentrated in the final stretch
  // (J-21 -> J-7) -- the gap between the two cumulative shares. A large
  // gap means most demand only firms up close to arrival (harder to
  // forecast); a small gap means guests commit early.
  const early = curve.find((entry) => entry.leadTimeDays === 21)?.bookedPct ?? 0;
  const late = curve.find((entry) => entry.leadTimeDays === 7)?.bookedPct ?? 0;
  const momentum = late - early;

  return { curve, momentum };
}
