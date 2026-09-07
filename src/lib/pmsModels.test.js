import {
  createReservation,
  findReservationConflicts,
  normalizeReservation,
  toClientPayload,
  toReservationPayload,
  toRoomPayload,
} from "./pmsModels";

// These payload shapes are what pmsRepository.js actually sends to Supabase.
// The real project's rooms/reservations/clients tables were missing several
// of these columns and had two French-only CHECK constraints (see
// supabase/migrations/202609070007_pms_schema_alignment.sql); this file
// pins the JS-side shape that migration was written against.
describe("toRoomPayload", () => {
  test("includes every column added by the schema-alignment migration", () => {
    const payload = toRoomPayload({ number: "101", type: "suite", price: 189.5, status: "libre" });
    expect(payload).toMatchObject({
      number: "101",
      type: "suite",
      price: 189.5,
      status: "libre",
      floor: null,
      capacity: 2,
      housekeeping_status: "clean",
      maintenance_notes: "",
      external_id: null,
      metadata: {},
    });
    expect(payload).not.toHaveProperty("created_at");
    expect(payload).not.toHaveProperty("updated_at");
  });
});

describe("toClientPayload", () => {
  test("includes every column added by the schema-alignment migration", () => {
    const payload = toClientPayload({ name: "Ada Lovelace", email: "ada@example.com" });
    expect(payload).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      segment: "leisure",
      company: "",
      notes: "",
      external_id: null,
      metadata: {},
    });
  });
});

describe("reservation channel/source mapping", () => {
  test("toReservationPayload writes the real `channel` column, not `source`", () => {
    const payload = toReservationPayload({ client_name: "Ada", room_id: 1, arrival: "2026-09-10", departure: "2026-09-12", status: "confirmée", source: "ota" });
    expect(payload.channel).toBe("ota");
    expect(payload).not.toHaveProperty("source");
  });

  test("defaults the channel to 'direct', matching the channel_check constraint domain", () => {
    const payload = toReservationPayload({ client_name: "Ada", room_id: 1, arrival: "2026-09-10", departure: "2026-09-12", status: "confirmée" });
    expect(payload.channel).toBe("direct");
  });

  test("createReservation/normalizeReservation reads `channel` back from a DB row into `source`", () => {
    const fromDb = normalizeReservation({ id: 1, client_name: "Ada", room_id: 1, arrival: "2026-09-10", departure: "2026-09-12", status: "confirmée", channel: "corporate" });
    expect(fromDb.source).toBe("corporate");
  });

  test("prefers an explicit `source` over `channel` when both are present (e.g. already-normalized in-memory data)", () => {
    const reservation = createReservation({ source: "agency", channel: "ota" });
    expect(reservation.source).toBe("agency");
  });

  test("includes every column added by the schema-alignment migration", () => {
    const payload = toReservationPayload({ client_name: "Ada", room_id: 1, arrival: "2026-09-10", departure: "2026-09-12", status: "confirmée" });
    expect(payload).toMatchObject({
      client_name: "Ada",
      client: "Ada",
      client_email: "",
      client_phone: "",
      room: "",
      notes: "",
      external_id: null,
      metadata: {},
    });
  });

  // segment_check now allows leisure/corporate/ota/groups (English, matching
  // rm.js's reservationSegment()) instead of the old loisir/business/groupes.
  test("defaults segment to a value accepted by the widened segment_check constraint", () => {
    expect(toReservationPayload({ client_name: "Ada", room_id: 1, arrival: "2026-09-10", departure: "2026-09-12", status: "confirmée" }).segment).toBe("leisure");
  });

  // room_type_check now also allows seminar/conference (PMS meeting-room
  // scheduling), not just standard/deluxe/suite.
  test("accepts a seminar/conference room_type for meeting-room scheduling", () => {
    const payload = toReservationPayload({ client_name: "Ada", room_id: 1, arrival: "2026-09-10", departure: "2026-09-12", status: "confirmée", room_type: "seminar" });
    expect(payload.room_type).toBe("seminar");
  });
});

test("findReservationConflicts still works with the channel-mapped reservation shape", () => {
  const existing = normalizeReservation({ id: 1, room_id: 5, arrival: "2026-09-10", departure: "2026-09-12", status: "confirmée", channel: "direct" });
  const candidate = { id: 2, room_id: 5, arrival: "2026-09-11", departure: "2026-09-13" };
  expect(findReservationConflicts([existing], candidate)).toHaveLength(1);
});
