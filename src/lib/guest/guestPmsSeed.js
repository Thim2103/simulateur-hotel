// The room/reservation seed data, split out of guestAdapter.js so
// lib/pmsRepository.js can seed its own guest branch without pulling in
// guestAdapter.js's lib/hotel.js dependency (see guestRepository.js's
// header comment for the full cycle this avoids -- lib/hotel.js
// transitively imports lib/pmsRepository.js). Only depends on
// lib/pmsModels.js, which has no such cycle.
import { createReservation, createRoom } from "../pmsModels";

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(base, days) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

// Six rooms and a handful of reservations spread around "today" (relative
// to whenever the guest actually starts, not a fixed date baked into the
// seed) -- enough real occupancy/segment variety for RM/events/staff to
// have something to react to from cycle one. Kept in sync with
// guestAdapter.js's createGuestHotelBundle(), which calls these same two
// functions -- every guest surface (Career, PMS, RM) starts from the
// exact same six rooms/four reservations.
export function seedRooms() {
  return [
    createRoom({ id: 1, number: "101", type: "standard", price: 120, floor: 1, capacity: 2 }),
    createRoom({ id: 2, number: "102", type: "standard", price: 120, floor: 1, capacity: 2 }),
    createRoom({ id: 3, number: "201", type: "deluxe", price: 180, floor: 2, capacity: 2 }),
    createRoom({ id: 4, number: "202", type: "deluxe", price: 180, floor: 2, capacity: 3 }),
    createRoom({ id: 5, number: "301", type: "suite", price: 320, floor: 3, capacity: 4 }),
    createRoom({ id: 6, number: "S01", type: "seminar", price: 450, floor: 0, capacity: 20 }),
  ];
}

export function seedReservations(referenceDate) {
  return [
    createReservation({ id: 1, room_id: 1, client_name: "Ada Lovelace", arrival: toDateOnly(addDays(referenceDate, -1)), departure: toDateOnly(addDays(referenceDate, 2)), status: "confirmée", price: 120, source: "direct", segment: "leisure" }),
    createReservation({ id: 2, room_id: 3, client_name: "Grace Hopper", arrival: toDateOnly(referenceDate), departure: toDateOnly(addDays(referenceDate, 3)), status: "confirmée", price: 180, source: "booking", segment: "leisure" }),
    createReservation({ id: 3, room_id: 4, client_name: "Alan Turing", arrival: toDateOnly(addDays(referenceDate, 1)), departure: toDateOnly(addDays(referenceDate, 4)), status: "confirmée", price: 190, source: "corporate", segment: "corporate" }),
    createReservation({ id: 4, room_id: 5, client_name: "Katherine Johnson", arrival: toDateOnly(addDays(referenceDate, 2)), departure: toDateOnly(addDays(referenceDate, 5)), status: "option", price: 320, source: "direct", segment: "leisure" }),
  ];
}
