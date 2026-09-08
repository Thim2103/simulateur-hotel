// Persistence layer for the hotel-level simulation, modeled on restaurantRepository.js.
// Order of resilience: Supabase -> localStorage cache -> in-memory mock (see hotel.mock.js).
import { assertSupabaseConfigured, ensureAuthSession, requireUserId } from "./supabase";
import { safeLoad } from "./safeLoad";
import { safeObject } from "./safe";
import { defaultHotelState } from "./hotel";
import { resolveSession } from "./sessionResolver";
import { createGuestHotelBundle, createGuestRepository } from "./guest";

// Pre-auth seed row: only referenced so the first signed-in user can claim it
// (see claimLegacyHotel()). Every other hotel gets a fresh id from the DB.
const LEGACY_HOTEL_ID = "00000000-0000-0000-0000-000000000002";
const LOCAL_STORAGE_KEY = "hotel-simulator-state";

export function readHotelLocalStorage() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.error("[hotelRepository] failed to read localStorage cache:", error);
    return null;
  }
}

export function writeHotelLocalStorage(state) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("[hotelRepository] failed to write localStorage cache:", error);
  }
}

function hotelPayload(state = {}, userId) {
  const source = safeObject(state);
  return {
    user_id: userId,
    structure: { ...defaultHotelState.structure, ...(source.structure || {}) },
    finance: { ...defaultHotelState.finance, ...(source.finance || {}) },
    marketing: { ...defaultHotelState.marketing, ...(source.marketing || {}) },
    esg: { ...defaultHotelState.esg, ...(source.esg || {}) },
    expansion: { ...defaultHotelState.expansion, ...(source.expansion || {}) },
    progression: { ...defaultHotelState.progression, ...(source.progression || {}) },
  };
}

async function selectOwnHotel(userId) {
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("hotels").select("*").eq("user_id", userId).limit(1);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    [],
    { label: "select:hotels" }
  );
}

// One-time claim of the pre-auth seed row (user_id IS NULL) for whichever
// signed-in user loads the simulator first; a no-op once it has been claimed
// by someone (the update then matches zero rows).
async function claimLegacyHotel(userId) {
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client
        .from("hotels")
        .update({ user_id: userId })
        .eq("id", LEGACY_HOTEL_ID)
        .is("user_id", null)
        .select("*");
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    [],
    { label: "claim:hotels" }
  );
}

async function insertHotel(state, userId) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client.from("hotels").insert(hotelPayload(state, userId)).select("*");
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

// Guest Mode branch: a ready-to-play hotelState (see
// lib/guest/guestAdapter.js's createGuestHotelBundle() -- the same seed
// Career/Restaurant/PMS use, so a guest sees one consistent hotel
// everywhere) persisted to its own localStorage document instead of
// Supabase. Same namespace convention as useCareer.js's
// guestCareerRepository/useRestaurant.js's guestRestaurantRepository.
const guestHotelRepository = createGuestRepository("hotel-simulator", { defaultState: null });

async function loadGuestHotelState() {
  const existing = await guestHotelRepository.get();
  if (existing) return existing;
  const seeded = createGuestHotelBundle().hotelState;
  await guestHotelRepository.save(seeded);
  return seeded;
}

export async function getHotelState() {
  if ((await resolveSession()).mode === "guest") return loadGuestHotelState();

  const userId = await ensureAuthSession();
  if (!userId) {
    // No authenticated session yet (Supabase not configured, or anonymous
    // sign-in not enabled/reachable): fall back to the cached snapshot.
    const cached = readHotelLocalStorage();
    if (cached) return cached;
    throw new Error("Supabase indisponible (session non authentifiee) et aucune sauvegarde locale trouvée.");
  }

  let rows = await selectOwnHotel(userId);
  if (!rows.length) rows = await claimLegacyHotel(userId);

  let profile = rows[0];
  if (!profile) {
    const cached = readHotelLocalStorage();
    if (cached) return cached;
    throw new Error("Supabase indisponible et aucune sauvegarde locale trouvée.");
  }
  profile = safeObject(profile);
  return {
    structure: profile.structure,
    finance: profile.finance,
    marketing: profile.marketing,
    esg: profile.esg,
    expansion: profile.expansion,
    progression: profile.progression,
  };
}

export async function saveHotelState(state) {
  if ((await resolveSession()).mode === "guest") {
    await guestHotelRepository.save(state);
    return;
  }

  writeHotelLocalStorage(state);
  const userId = await requireUserId();
  const client = assertSupabaseConfigured();

  let existing = await selectOwnHotel(userId);
  if (!existing.length) existing = await claimLegacyHotel(userId);
  if (!existing.length) {
    await insertHotel(state, userId);
    return;
  }
  const { error } = await client.from("hotels").update(hotelPayload(state, userId)).eq("user_id", userId);
  if (error) throw error;
}

// Persists the hotel's state after a simulated day (see
// lib/dailyCycle/saveDailyState.js). Currently an alias for saveHotelState:
// the daily cycle folds its results into the same `hotels` row rather than
// its own table, so there's nothing day-specific to persist beyond that.
export const saveDailyState = saveHotelState;

export const hotelRepository = {
  getHotelState,
  saveHotelState,
  saveDailyState,
};
