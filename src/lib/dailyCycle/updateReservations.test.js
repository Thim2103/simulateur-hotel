import { updateReservations } from "./updateReservations";

const TODAY = new Date("2026-09-10T12:00:00Z");

function room(overrides = {}) {
  return { id: 1, number: "101", status: "libre", housekeeping_status: "clean", ...overrides };
}

function reservation(overrides = {}) {
  return { id: 1, room_id: 1, client_name: "Ada", status: "confirmée", arrival: "2026-09-10", departure: "2026-09-12", ...overrides };
}

test("checks in a confirmed reservation arriving today: the room becomes occupied", () => {
  const result = updateReservations({ rooms: [room()], reservations: [reservation()], referenceDate: TODAY });

  expect(result.rooms[0].status).toBe("occupée");
  expect(result.changedRoomIds).toEqual([1]);
  expect(result.changes.checkIns).toEqual([{ id: 1, client: "Ada", roomId: 1 }]);
});

test("checks out a confirmed reservation departing today: the room is freed and flagged dirty", () => {
  const result = updateReservations({
    rooms: [room({ status: "occupée" })],
    reservations: [reservation({ arrival: "2026-09-08", departure: "2026-09-10" })],
    referenceDate: TODAY,
  });

  expect(result.rooms[0].status).toBe("libre");
  expect(result.rooms[0].housekeeping_status).toBe("dirty");
  expect(result.changes.checkOuts).toEqual([{ id: 1, client: "Ada", roomId: 1 }]);
});

test("marks a still-pending reservation whose arrival date has passed as a no-show", () => {
  const result = updateReservations({
    rooms: [room()],
    reservations: [reservation({ status: "en attente", arrival: "2026-09-08", departure: "2026-09-10" })],
    referenceDate: TODAY,
  });

  expect(result.reservations[0].status).toBe("annulée");
  expect(result.changedReservationIds).toEqual([1]);
  expect(result.changes.noShows).toEqual([{ id: 1, client: "Ada", roomId: 1 }]);
});

test("leaves an already-cancelled reservation untouched", () => {
  const cancelled = reservation({ status: "annulée", arrival: "2026-09-08", departure: "2026-09-10" });
  const result = updateReservations({ rooms: [room()], reservations: [cancelled], referenceDate: TODAY });

  expect(result.reservations[0]).toEqual(cancelled);
  expect(result.changes.noShows).toHaveLength(0);
});

test("leaves a future or already-departed reservation untouched", () => {
  const future = reservation({ id: 2, arrival: "2026-09-20", departure: "2026-09-22" });
  const result = updateReservations({ rooms: [room()], reservations: [future], referenceDate: TODAY });

  expect(result.reservations[0]).toEqual(future);
  expect(result.rooms[0].status).toBe("libre");
});

test("handles missing rooms/reservations without throwing", () => {
  expect(() => updateReservations({})).not.toThrow();
  expect(updateReservations({})).toMatchObject({ rooms: [], reservations: [], changedRoomIds: [], changedReservationIds: [] });
});
