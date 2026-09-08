// The bridge between Guest Mode and the rest of the engine: an
// auth-like API (mirrors lib/supabase.js's ensureAuthSession()/
// requireUserId() contract so a call site can swap one for the other
// without changing shape), a generic get/save repository factory backed
// by guestState.js, and a ready-to-play hotel/restaurant/PMS bundle so a
// brand-new guest can start playing immediately -- no empty hotel, no
// "fill in the Structure form first" gate to clear before runDailyCycle()
// has anything to simulate.
import { ensureGuestSession } from "./guestSession";
import { loadGuestState, saveGuestState } from "./guestState";
import { defaultHotelState } from "../hotel";
import { defaultRestaurantState } from "../legacyRestaurantSimulator";
import { markRestaurantReady } from "../restaurant/restaurantState";
import { createReservation, createRoom } from "../pmsModels";

// Mirrors ensureAuthSession()/requireUserId() -- never throws, never
// null: the guest id is always available once a session exists.
export function ensureGuestAuthSession() {
  return Promise.resolve(ensureGuestSession().user.id);
}

export async function requireGuestUserId() {
  const session = ensureGuestSession();
  return session.user.id;
}

// A minimal repository-shaped adapter over guestState -- a drop-in local
// replacement for a Supabase repository's { get(), save() } pair.
export function createGuestRepository(namespace, { defaultState = null } = {}) {
  return {
    async get() {
      return loadGuestState(namespace, defaultState);
    },
    async save(state) {
      saveGuestState(namespace, state);
      return state;
    },
    clear() {
      saveGuestState(namespace, defaultState);
    },
  };
}

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
// have something to react to from cycle one.
function seedRooms() {
  return [
    createRoom({ id: 1, number: "101", type: "standard", price: 120, floor: 1, capacity: 2 }),
    createRoom({ id: 2, number: "102", type: "standard", price: 120, floor: 1, capacity: 2 }),
    createRoom({ id: 3, number: "201", type: "deluxe", price: 180, floor: 2, capacity: 2 }),
    createRoom({ id: 4, number: "202", type: "deluxe", price: 180, floor: 2, capacity: 3 }),
    createRoom({ id: 5, number: "301", type: "suite", price: 320, floor: 3, capacity: 4 }),
    createRoom({ id: 6, number: "S01", type: "seminar", price: 450, floor: 0, capacity: 20 }),
  ];
}

function seedReservations(referenceDate) {
  return [
    createReservation({ id: 1, room_id: 1, client_name: "Ada Lovelace", arrival: toDateOnly(addDays(referenceDate, -1)), departure: toDateOnly(addDays(referenceDate, 2)), status: "confirmée", price: 120, source: "direct", segment: "leisure" }),
    createReservation({ id: 2, room_id: 3, client_name: "Grace Hopper", arrival: toDateOnly(referenceDate), departure: toDateOnly(addDays(referenceDate, 3)), status: "confirmée", price: 180, source: "booking", segment: "leisure" }),
    createReservation({ id: 3, room_id: 4, client_name: "Alan Turing", arrival: toDateOnly(addDays(referenceDate, 1)), departure: toDateOnly(addDays(referenceDate, 4)), status: "confirmée", price: 190, source: "corporate", segment: "corporate" }),
    createReservation({ id: 4, room_id: 5, client_name: "Katherine Johnson", arrival: toDateOnly(addDays(referenceDate, 2)), departure: toDateOnly(addDays(referenceDate, 5)), status: "option", price: 320, source: "direct", segment: "leisure" }),
  ];
}

// A complete { hotelState, restaurantState, rooms, reservations } bundle
// -- exactly what runDailyCycle()/careerEngine.startCareer() need --
// generated fresh (never persisted on its own; the caller saves whatever
// namespace it belongs to).
export function createGuestHotelBundle({ referenceDate = new Date() } = {}) {
  return {
    hotelState: { ...defaultHotelState, progression: { ...defaultHotelState.progression } },
    restaurantState: markRestaurantReady({ ...defaultRestaurantState, pmsContext: { ...defaultRestaurantState.pmsContext } }),
    rooms: seedRooms(),
    reservations: seedReservations(referenceDate),
  };
}

export const guestAdapter = { ensureGuestAuthSession, requireGuestUserId, createGuestRepository, createGuestHotelBundle };
export default guestAdapter;
