import { runSegmentation } from "./segmentation";

function reservation(overrides = {}) {
  return { id: 1, room_id: 1, arrival: "2026-09-01", departure: "2026-09-03", status: "confirmée", price: 100, segment: "leisure", channel: "direct", ...overrides };
}

test("returns the segment mix (counts) from the reservation book", () => {
  const result = runSegmentation({
    reservations: [reservation({ id: 1, segment: "leisure" }), reservation({ id: 2, segment: "corporate" })],
  });
  expect(result.mix).toEqual({ corporate: 1, leisure: 1, ota: 0, groups: 0 });
});

test("computes ADR per segment from confirmed reservations only", () => {
  const result = runSegmentation({
    reservations: [
      reservation({ id: 1, segment: "leisure", price: 100 }),
      reservation({ id: 2, segment: "leisure", price: 200 }),
      reservation({ id: 3, segment: "corporate", price: 300, status: "annulée" }),
    ],
  });
  expect(result.adrBySegment.leisure).toBe(150);
  expect(result.adrBySegment.corporate).toBeUndefined();
});

test("exposes per-segment performance and per-channel yield", () => {
  const result = runSegmentation({ reservations: [reservation()], occupancy: 60 });
  expect(result.performance.leisure).toBeDefined();
  expect(result.channels.direct).toBeDefined();
});

test("handles an empty reservation list without throwing", () => {
  expect(() => runSegmentation({ reservations: [] })).not.toThrow();
  expect(runSegmentation({ reservations: [] }).mix).toEqual({ corporate: 0, leisure: 0, ota: 0, groups: 0 });
});

test("handles a missing reservations array without throwing", () => {
  expect(() => runSegmentation({})).not.toThrow();
});
