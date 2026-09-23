// Pure, derived reads for HotelSchematicView.jsx (Étape 3 of the "board
// game numérique" redesign): today's arrivals/departures at the
// reception desk, which guest (if any) is currently in a room, and a
// light breakfast-covers forecast. Nothing here is new state -- every
// figure is read straight off the rooms/reservations the rest of the app
// already has (see lib/clients/guestProfiles.js's vipGuestsInHouse() for
// the same "reservation currently covering this night" pattern, done
// here for every guest, not just V.I.P.s).
import { safeArray, safeNumber } from "../safe";

const toDateOnly = (value) => String(value ?? "").slice(0, 10);
const isCancelled = (reservation) => String(reservation.status || "").toLowerCase().includes("annul");

// { arrivals, departures } -- reservations landing or leaving on `date`.
export function arrivalsDeparturesToday(reservations, date) {
  const today = toDateOnly(date ?? new Date());
  const active = safeArray(reservations).filter((reservation) => !isCancelled(reservation));
  return {
    arrivals: active.filter((reservation) => toDateOnly(reservation.arrival) === today).length,
    departures: active.filter((reservation) => toDateOnly(reservation.departure) === today).length,
  };
}

// The guest currently sleeping in `room` on the night of `date`, or null
// -- a room can read "occupée" (see pmsModels.js) without a matching
// reservation in test/demo data, so this always falls back gracefully.
export function guestInRoom(room, reservations, date) {
  const today = toDateOnly(date ?? new Date());
  const stay = safeArray(reservations).find(
    (reservation) => !isCancelled(reservation) && Number(reservation.room_id) === Number(room?.id) && toDateOnly(reservation.arrival) <= today && today < toDateOnly(reservation.departure)
  );
  return stay?.client_name || null;
}

// A simple "combien de couverts ce matin" estimate: one cover per guest
// currently in house (occupied rooms x their capacity, or 1 per room when
// capacity is unknown) -- a presentational forecast, not a booked count,
// since the simulator has no standalone breakfast-service engine yet.
export function breakfastCoversForecast(rooms) {
  return safeArray(rooms)
    .filter((room) => room.status === "occupée")
    .reduce((total, room) => total + Math.max(1, safeNumber(room.capacity, 1)), 0);
}

const hotelSchematicEngine = { arrivalsDeparturesToday, guestInRoom, breakfastCoversForecast };
export default hotelSchematicEngine;
