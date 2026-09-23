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
import { seedStarterInnRooms } from "./starterInnSeed";
import { createGuestRepository, ensureGuestAuthSession, requireGuestUserId } from "./guestRepository";

export { ensureGuestAuthSession, requireGuestUserId, createGuestRepository };

// A complete { hotelState, restaurantState, rooms, reservations } bundle
// -- exactly what runDailyCycle()/careerEngine.startCareer() need --
// generated fresh (never persisted on its own; the caller saves whatever
// namespace it belongs to).
// A new guest's restaurant opens with no history of its own: unlike
// hotelFinancials (lib/hotel.js), whose revenue/costs arrays are a
// deliberate device to set the hotel's starting treasury,
// restaurantState.finance never feeds investmentFunding.js's balanceOf()
// (only hotelState.finance does), so there is no starting-cash reason to
// pre-fill it -- doing so only left six months of
// legacyRestaurantSimulator.js's freestanding 92-seat bistro's revenue
// sitting in a brand-new hotel's Jour 0 P&L (Game Balancing V1.0, Lot 7's
// accounting engine surfaced it). Only revenue/costs/months are reset:
// payroll/fixedCosts/rent stay -- they drive the ongoing daily cost, not
// a Jour 0 figure, and legacyRestaurantSimulator.js's own defaults (used
// elsewhere as a generic normalization fallback) are untouched. Shared by
// createGuestHotelBundle() and createStarterInnBundle() below.
function freshRestaurantState() {
  return markRestaurantReady({
    ...defaultRestaurantState,
    pmsContext: { ...defaultRestaurantState.pmsContext },
    finance: { ...defaultRestaurantState.finance, months: {}, revenue: [], costs: [] },
  });
}

export function createGuestHotelBundle({ referenceDate = new Date() } = {}) {
  return {
    hotelState: { ...defaultHotelState, progression: { ...defaultHotelState.progression } },
    restaurantState: freshRestaurantState(),
    rooms: seedRooms(),
    reservations: seedReservations(referenceDate),
  };
}

// "Ma Première Auberge" (Étape 3, see starterInnSeed.js): what a brand-new
// career actually starts from -- 4 simple rooms, no reservations yet, and
// a tight 10 000 € opening treasury with fixedCosts/payroll scaled down
// from hotelFinancials' own 6-room figures (roughly the 4/6 room-count
// ratio) so a well-run early game can actually carry them, the same
// "Game Balancing" intent lib/hotel.js's own hotelFinancials comment
// describes for the richer seed. PMS/RM/Finance/TFE reached directly by a
// guest (never through Career) keep using createGuestHotelBundle() above.
export function createStarterInnBundle() {
  return {
    hotelState: {
      ...defaultHotelState,
      progression: { ...defaultHotelState.progression },
      finance: { ...defaultHotelState.finance, months: ["Ouverture"], revenue: [10000], costs: [0], fixedCosts: 1500, payroll: 3000 },
    },
    restaurantState: freshRestaurantState(),
    rooms: seedStarterInnRooms(),
    reservations: [],
  };
}

export const guestAdapter = { ensureGuestAuthSession, requireGuestUserId, createGuestRepository, createGuestHotelBundle, createStarterInnBundle };
export default guestAdapter;
