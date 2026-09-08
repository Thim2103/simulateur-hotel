// The bridge between Guest Mode and the rest of the engine: a ready-to-
// play hotel/restaurant/PMS bundle so a brand-new guest can start playing
// immediately -- no empty hotel, no "fill in the Structure form first"
// gate to clear before runDailyCycle() has anything to simulate.
//
// The auth-like API and the generic get/save repository factory used to
// live in this file too; they moved to guestRepository.js (re-exported
// below, unchanged for every existing caller) so lib/pmsRepository.js
// could depend on just that half without pulling in this file's lib/
// hotel.js dependency -- see guestRepository.js's header comment for the
// import cycle that would otherwise create.
import { defaultHotelState } from "../hotel";
import { defaultRestaurantState } from "../legacyRestaurantSimulator";
import { markRestaurantReady } from "../restaurant/restaurantState";
import { seedReservations, seedRooms } from "./guestPmsSeed";
import { createGuestRepository, ensureGuestAuthSession, requireGuestUserId } from "./guestRepository";

export { ensureGuestAuthSession, requireGuestUserId, createGuestRepository };

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
