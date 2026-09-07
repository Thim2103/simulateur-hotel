// Persistence layer for the hotel-level simulation, modeled on restaurantRepository.js.
// Order of resilience: Supabase -> localStorage cache -> in-memory mock (see hotel.mock.js).
import { assertSupabaseConfigured } from "./supabase";
import { safeLoad } from "./safeLoad";
import { safeObject } from "./safe";
import { defaultHotelState } from "./hotel";

const HOTEL_ID = "00000000-0000-0000-0000-000000000002";
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

function hotelPayload(state = {}) {
  const source = safeObject(state);
  return {
    id: HOTEL_ID,
    structure: { ...defaultHotelState.structure, ...(source.structure || {}) },
    finance: { ...defaultHotelState.finance, ...(source.finance || {}) },
    marketing: { ...defaultHotelState.marketing, ...(source.marketing || {}) },
    esg: { ...defaultHotelState.esg, ...(source.esg || {}) },
    expansion: { ...defaultHotelState.expansion, ...(source.expansion || {}) },
    progression: { ...defaultHotelState.progression, ...(source.progression || {}) },
  };
}

async function selectHotel() {
  return safeLoad(
    async () => {
      const client = assertSupabaseConfigured();
      const { data, error } = await client.from("hotels").select("*").eq("id", HOTEL_ID).limit(1);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
    [],
    { label: "select:hotels" }
  );
}

async function insertHotel(state) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client.from("hotels").insert(hotelPayload(state)).select("*");
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function getHotelState() {
  const rows = await selectHotel();
  let profile = rows[0];
  if (!profile) {
    // Supabase not configured/reachable: safeLoad already returned [] silently,
    // fall back to the cached localStorage snapshot if we have one.
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
  writeHotelLocalStorage(state);
  const client = assertSupabaseConfigured();
  const existing = await selectHotel();
  if (!existing.length) {
    await insertHotel(state);
    return;
  }
  const { error } = await client.from("hotels").update(hotelPayload(state)).eq("id", HOTEL_ID);
  if (error) throw error;
}

export const hotelRepository = {
  getHotelState,
  saveHotelState,
};
