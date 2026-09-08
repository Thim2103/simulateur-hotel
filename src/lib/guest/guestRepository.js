// The generic parts of the Guest Mode bridge that must NOT depend on
// lib/hotel.js/lib/legacyRestaurantSimulator.js/lib/restaurant/
// restaurantState.js (see guestAdapter.js's createGuestHotelBundle(),
// which does): lib/hotel.js itself transitively imports
// lib/pmsRepository.js (via lib/calculs/rm.js), and pmsRepository.js
// needs createGuestRepository() for its own guest branch -- if that came
// from the same file as createGuestHotelBundle(), the import graph would
// cycle: guestAdapter -> hotel -> calculs/rm -> pmsRepository ->
// guestAdapter. Splitting the dependency-free half out here breaks that
// cycle; guestAdapter.js re-exports everything from here unchanged so
// every existing import (`from "../lib/guest"`, `from "../lib/guest/
// guestAdapter"`) keeps working.
import { ensureGuestSession } from "./guestSession";
import { loadGuestState, saveGuestState } from "./guestState";

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
