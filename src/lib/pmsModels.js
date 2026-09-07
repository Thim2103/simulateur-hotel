export const ROOM_TYPES = ["standard", "deluxe", "suite", "seminar", "conference"];
export const ROOM_STATUSES = ["libre", "occupée", "maintenance", "hors_service"];
export const RESERVATION_STATUSES = ["confirmée", "option", "annulée", "en attente"];

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

export function createRoom(values = {}) {
  return {
    id: values.id ?? null,
    external_id: values.external_id ?? null,
    number: String(values.number ?? ""),
    type: String(values.type ?? "standard"),
    price: Number(values.price) || 0,
    status: String(values.status ?? "libre"),
    floor: values.floor ?? null,
    capacity: Number(values.capacity) || 2,
    housekeeping_status: String(values.housekeeping_status ?? "clean"),
    maintenance_notes: String(values.maintenance_notes ?? ""),
    metadata: values.metadata ?? {},
    created_at: values.created_at ?? null,
    updated_at: values.updated_at ?? null,
  };
}

export function normalizeRoom(row = {}) {
  return createRoom(row);
}

export function toRoomPayload(room) {
  const normalized = createRoom(room);
  return {
    ...(normalized.id ? { id: normalized.id } : {}),
    number: normalized.number,
    type: normalized.type,
    price: normalized.price,
    status: normalized.status,
    floor: normalized.floor,
    capacity: normalized.capacity,
    housekeeping_status: normalized.housekeeping_status,
    maintenance_notes: normalized.maintenance_notes,
    external_id: normalized.external_id,
    metadata: normalized.metadata,
  };
}

export function createClient(values = {}) {
  return {
    id: values.id ?? null,
    external_id: values.external_id ?? null,
    name: String(firstValue(values.name, values.full_name, "")),
    email: String(values.email ?? ""),
    phone: String(values.phone ?? ""),
    segment: String(values.segment ?? "leisure"),
    company: String(values.company ?? ""),
    notes: String(values.notes ?? ""),
    metadata: values.metadata ?? {},
    created_at: values.created_at ?? null,
    updated_at: values.updated_at ?? null,
  };
}

export function normalizeClient(row = {}) {
  return createClient(row);
}

export function toClientPayload(client) {
  const normalized = createClient(client);
  return {
    ...(normalized.id ? { id: normalized.id } : {}),
    name: normalized.name,
    email: normalized.email,
    phone: normalized.phone,
    segment: normalized.segment,
    company: normalized.company,
    notes: normalized.notes,
    external_id: normalized.external_id,
    metadata: normalized.metadata,
  };
}

export function createReservation(values = {}) {
  const clientName = String(firstValue(values.client_name, values.client, "Guest"));
  const roomId = firstValue(values.room_id, values.roomId);
  return {
    id: values.id ?? null,
    external_id: values.external_id ?? null,
    client_id: values.client_id ?? null,
    client_name: clientName,
    client: String(firstValue(values.client, clientName)),
    client_email: String(values.client_email ?? ""),
    client_phone: String(values.client_phone ?? ""),
    room_id: roomId !== undefined ? Number(roomId) : null,
    room: String(values.room ?? ""),
    room_type: String(values.room_type ?? "standard"),
    arrival: String(values.arrival ?? ""),
    departure: String(values.departure ?? ""),
    status: String(values.status ?? "en attente"),
    price: Number(values.price) || 0,
    notes: String(values.notes ?? ""),
    // The DB column is `channel` (see supabase/migrations/202609070007_pms_schema_alignment.sql);
    // `source` is the field name used throughout the rest of the app.
    source: String(firstValue(values.source, values.channel, "direct")),
    segment: String(values.segment ?? "leisure"),
    metadata: values.metadata ?? {},
    created_at: values.created_at ?? null,
    updated_at: values.updated_at ?? null,
  };
}

export function normalizeReservation(row = {}) {
  return createReservation(row);
}

function toDateOnly(value) {
  return String(value || "").slice(0, 10);
}

export function reservationsOverlap(a, b) {
  return toDateOnly(a.arrival) < toDateOnly(b.departure) && toDateOnly(b.arrival) < toDateOnly(a.departure);
}

// Same room, overlapping stay, not cancelled = a double-booking conflict.
export function findReservationConflicts(reservations = [], candidate) {
  return (Array.isArray(reservations) ? reservations : []).filter(
    (reservation) =>
      Number(reservation.id) !== Number(candidate.id) &&
      Number(reservation.room_id) === Number(candidate.room_id) &&
      !String(reservation.status || "").toLowerCase().includes("annul") &&
      reservationsOverlap(reservation, candidate)
  );
}

export function toReservationPayload(reservation) {
  const normalized = createReservation(reservation);
  return {
    ...(normalized.id ? { id: normalized.id } : {}),
    client_id: normalized.client_id,
    client_name: normalized.client_name,
    client: normalized.client_name,
    client_email: normalized.client_email,
    client_phone: normalized.client_phone,
    room_id: normalized.room_id,
    room: normalized.room,
    room_type: normalized.room_type,
    arrival: normalized.arrival,
    departure: normalized.departure,
    status: normalized.status,
    price: normalized.price,
    notes: normalized.notes,
    channel: normalized.source, // see createReservation()'s comment: `channel` is the real column
    segment: normalized.segment,
    external_id: normalized.external_id,
    metadata: normalized.metadata,
  };
}
