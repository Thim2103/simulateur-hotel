import { assertSupabaseConfigured, ensureAuthSession, requireUserId } from "./supabase";
import {
  normalizeClient,
  normalizeReservation,
  normalizeRoom,
  toClientPayload,
  toReservationPayload,
  toRoomPayload,
} from "./pmsModels";

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

export async function listRooms() {
  return (await list("rooms", "number")).map(normalizeRoom);
}

export async function saveRoom(room) {
  return normalizeRoom(await save("rooms", toRoomPayload(room)));
}

export async function deleteRoom(id) {
  return remove("rooms", id);
}

export async function listReservations() {
  return (await list("reservations", "arrival")).map(normalizeReservation);
}

export async function saveReservation(reservation) {
  return normalizeReservation(await save("reservations", toReservationPayload(reservation)));
}

export async function deleteReservation(id) {
  return remove("reservations", id);
}

export async function listClients() {
  return (await list("clients", "name")).map(normalizeClient);
}

export async function saveClient(client) {
  return normalizeClient(await save("clients", toClientPayload(client)));
}

export async function deleteClient(id) {
  return remove("clients", id);
}
