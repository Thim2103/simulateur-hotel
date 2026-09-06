import { assertSupabaseConfigured } from "./supabase";
import {
  normalizeClient,
  normalizeReservation,
  normalizeRoom,
  toClientPayload,
  toReservationPayload,
  toRoomPayload,
} from "./pmsModels";

async function list(table, order = "created_at") {
  const { data, error } = await assertSupabaseConfigured().from(table).select("*").order(order, { ascending: true, nullsFirst: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function save(table, payload) {
  const client = assertSupabaseConfigured();
  const query = payload.id
    ? client.from(table).update(payload).eq("id", payload.id).select().single()
    : client.from(table).insert(payload).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function remove(table, id) {
  const { error } = await assertSupabaseConfigured().from(table).delete().eq("id", id);
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
