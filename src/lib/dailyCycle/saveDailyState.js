// Persists a completed daily cycle. Delegates to each domain's own
// repository (hotelRepository/restaurantRepository/pmsRepository), which
// already scope every write to `user_id = auth.uid()` (see
// requireUserId()/ensureAuthSession() in lib/supabase.js) -- this module
// doesn't touch Supabase directly.
import { saveDailyState as saveHotelDailyState } from "../hotelRepository";
import { saveDailyState as saveRestaurantDailyState } from "../restaurantRepository";
import { saveDailyState as savePmsDailyState } from "../pmsRepository";

// hotelState/restaurantState: the full updated state objects for the day.
// rooms/reservations: only the rows that actually changed today (see
// updateReservations.js's changedRoomIds/changedReservationIds) -- saving
// only what changed keeps this fast and avoids clobbering concurrent edits
// to unrelated rows.
export async function saveDailyState({ hotelState, restaurantState, rooms = [], reservations = [] } = {}) {
  const [hotel, restaurant, pms] = await Promise.all([
    hotelState ? saveHotelDailyState(hotelState) : Promise.resolve(null),
    restaurantState ? saveRestaurantDailyState(restaurantState) : Promise.resolve(null),
    rooms.length || reservations.length ? savePmsDailyState({ rooms, reservations }) : Promise.resolve({ rooms: [], reservations: [] }),
  ]);

  return { hotel, restaurant, pms };
}
