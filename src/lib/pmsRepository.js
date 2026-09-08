import { assertSupabaseConfigured, ensureAuthSession, requireUserId } from "./supabase";
import {
  normalizeClient,
  normalizeReservation,
  normalizeRoom,
  toClientPayload,
  toReservationPayload,
  toRoomPayload,
} from "./pmsModels";
import { resolveSession } from "./sessionResolver";
// Imported from the specific submodules, not the "./guest" barrel: the
// barrel re-exports guestAdapter.js, which imports lib/hotel.js, which
// (via lib/calculs/rm.js) imports this very file -- see
// lib/guest/guestRepository.js's header comment for the full cycle that
// would create. createGuestRepository/seedRooms/seedReservations live in
// files with no such dependency.
import { createGuestRepository } from "./guest/guestRepository";
import { seedReservations, seedRooms } from "./guest/guestPmsSeed";
import { safeArray } from "./safe";

// One-time-per-table set of tables this browser session has already tried to
// claim legacy (pre-auth, user_id IS NULL) rows for, so repeated loads don't
// re-run the claim query on every render.
const claimedTables = new Set();

// Adopts every not-yet-claimed row (user_id IS NULL) in `table` for the
// current user, but only the first time this user loads it and only if they
// don't already own rows there -- a one-off migration of the pre-auth seed
// data to whichever signed-in session loads the simulator first.
async function claimOrphanRows(table, userId) {
  if (claimedTables.has(table)) return;
  claimedTables.add(table);

  const client = assertSupabaseConfigured();
  const { data: owned, error: ownedError } = await client.from(table).select("id").eq("user_id", userId).limit(1);
  if (ownedError) throw ownedError;
  if (owned?.length) return; // this user already has their own data here

  const { error } = await client.from(table).update({ user_id: userId }).is("user_id", null);
  if (error) throw error;
}

async function list(table, order = "created_at") {
  const userId = await ensureAuthSession();
  if (userId) await claimOrphanRows(table, userId);

  const client = assertSupabaseConfigured();
  let query = client.from(table).select("*").order(order, { ascending: true, nullsFirst: false });
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function save(table, payload) {
  const userId = await requireUserId();
  const client = assertSupabaseConfigured();
  const scopedPayload = { ...payload, user_id: userId };
  const query = payload.id
    ? client.from(table).update(scopedPayload).eq("id", payload.id).eq("user_id", userId).select().single()
    : client.from(table).insert(scopedPayload).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function remove(table, id) {
  const userId = await requireUserId();
  const { error } = await assertSupabaseConfigured().from(table).delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

// --- Guest Mode branch --------------------------------------------------
// One localStorage document holding all three PMS collections (rooms,
// reservations, clients), seeded on first access from the same bundle
// Career/Restaurant use (see lib/guest/guestAdapter.js's
// createGuestHotelBundle()) so a brand-new guest sees the same hotel
// everywhere in the app, not a second, empty one. Mirrors Supabase's own
// row shape/semantics closely enough that pmsModels.js's normalize*/to*
// Payload helpers work unchanged on either side.
const guestPmsRepository = createGuestRepository("pms", { defaultState: null });

async function loadGuestPmsState() {
  const existing = await guestPmsRepository.get();
  if (existing) return existing;
  const seeded = { rooms: seedRooms(), reservations: seedReservations(new Date()), clients: [] };
  await guestPmsRepository.save(seeded);
  return seeded;
}

function nextGuestId(rows) {
  const numericIds = safeArray(rows)
    .map((row) => Number(row.id))
    .filter((id) => Number.isFinite(id));
  return (numericIds.length ? Math.max(...numericIds) : 0) + 1;
}

async function guestList(collection, order) {
  const state = await loadGuestPmsState();
  const rows = safeArray(state[collection]);
  if (!order) return rows;
  return [...rows].sort((a, b) => String(a[order] ?? "").localeCompare(String(b[order] ?? "")));
}

async function guestSave(collection, payload) {
  const state = await loadGuestPmsState();
  const rows = safeArray(state[collection]);
  const now = new Date().toISOString();

  let saved;
  let nextRows;
  if (payload.id) {
    saved = { ...rows.find((row) => String(row.id) === String(payload.id)), ...payload, updated_at: now };
    nextRows = rows.map((row) => (String(row.id) === String(payload.id) ? saved : row));
  } else {
    saved = { ...payload, id: nextGuestId(rows), created_at: now, updated_at: now };
    nextRows = [...rows, saved];
  }

  await guestPmsRepository.save({ ...state, [collection]: nextRows });
  return saved;
}

async function guestRemove(collection, id) {
  const state = await loadGuestPmsState();
  const rows = safeArray(state[collection]).filter((row) => String(row.id) !== String(id));
  await guestPmsRepository.save({ ...state, [collection]: rows });
}

// --- Public API -----------------------------------------------------------
// Every export below resolves the session itself (resolveSession(), see
// hooks/useCareer.js's docstring for why this matters even for a call
// made right after another one in the same handler) and branches to the
// guest collection above instead of ever reaching Supabase for a guest
// session.

export async function listRooms() {
  const guest = (await resolveSession()).mode === "guest";
  const rows = guest ? await guestList("rooms", "number") : await list("rooms", "number");
  return rows.map(normalizeRoom);
}

export async function saveRoom(room) {
  const guest = (await resolveSession()).mode === "guest";
  const payload = toRoomPayload(room);
  const saved = guest ? await guestSave("rooms", payload) : await save("rooms", payload);
  return normalizeRoom(saved);
}

export async function deleteRoom(id) {
  const guest = (await resolveSession()).mode === "guest";
  return guest ? guestRemove("rooms", id) : remove("rooms", id);
}

export async function listReservations() {
  const guest = (await resolveSession()).mode === "guest";
  const rows = guest ? await guestList("reservations", "arrival") : await list("reservations", "arrival");
  return rows.map(normalizeReservation);
}

export async function saveReservation(reservation) {
  const guest = (await resolveSession()).mode === "guest";
  const payload = toReservationPayload(reservation);
  const saved = guest ? await guestSave("reservations", payload) : await save("reservations", payload);
  return normalizeReservation(saved);
}

export async function deleteReservation(id) {
  const guest = (await resolveSession()).mode === "guest";
  return guest ? guestRemove("reservations", id) : remove("reservations", id);
}

export async function listClients() {
  const guest = (await resolveSession()).mode === "guest";
  const rows = guest ? await guestList("clients", "name") : await list("clients", "name");
  return rows.map(normalizeClient);
}

export async function saveClient(client) {
  const guest = (await resolveSession()).mode === "guest";
  const payload = toClientPayload(client);
  const saved = guest ? await guestSave("clients", payload) : await save("clients", payload);
  return normalizeClient(saved);
}

export async function deleteClient(id) {
  const guest = (await resolveSession()).mode === "guest";
  return guest ? guestRemove("clients", id) : remove("clients", id);
}

// Persists a day's worth of PMS changes (see lib/dailyCycle/saveDailyState.js
// and updateReservations.js): rooms and reservations are collections, so
// unlike hotelRepository/restaurantRepository's saveDailyState() this saves
// only the rows that actually changed today rather than the whole table.
export async function saveDailyState({ rooms = [], reservations = [] } = {}) {
  const [savedRooms, savedReservations] = await Promise.all([
    Promise.all(rooms.map((room) => saveRoom(room))),
    Promise.all(reservations.map((reservation) => saveReservation(reservation))),
  ]);
  return { rooms: savedRooms, reservations: savedReservations };
}
