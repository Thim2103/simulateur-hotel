import { runPickup } from "./pickup";

function reservation(overrides = {}) {
  return { id: 1, created_at: "2026-09-01T10:00:00Z", segment: "leisure", channel: "direct", ...overrides };
}

test("daily mirrors lib/calculs/rm.js's pickup() overall count-per-day", () => {
  const result = runPickup({
    reservations: [reservation({ id: 1, created_at: "2026-09-01T10:00:00Z" }), reservation({ id: 2, created_at: "2026-09-01T18:00:00Z" }), reservation({ id: 3, created_at: "2026-09-02T09:00:00Z" })],
  });
  expect(result.daily).toEqual({ "2026-09-01": 2, "2026-09-02": 1 });
});

test("bySegment groups pickup counts by day within each segment", () => {
  const result = runPickup({
    reservations: [
      reservation({ id: 1, segment: "leisure", created_at: "2026-09-01T10:00:00Z" }),
      reservation({ id: 2, segment: "corporate", created_at: "2026-09-01T10:00:00Z" }),
      reservation({ id: 3, segment: "leisure", created_at: "2026-09-02T10:00:00Z" }),
    ],
  });
  expect(result.bySegment.leisure).toEqual({ "2026-09-01": 1, "2026-09-02": 1 });
  expect(result.bySegment.corporate).toEqual({ "2026-09-01": 1 });
});

test("byChannel groups pickup counts by day within each channel", () => {
  const result = runPickup({
    reservations: [
      reservation({ id: 1, channel: "ota", created_at: "2026-09-01T10:00:00Z" }),
      reservation({ id: 2, channel: "direct", created_at: "2026-09-01T10:00:00Z" }),
    ],
  });
  expect(result.byChannel.ota).toEqual({ "2026-09-01": 1 });
  expect(result.byChannel.direct).toEqual({ "2026-09-01": 1 });
});

test("ignores reservations without a created_at timestamp", () => {
  const result = runPickup({ reservations: [reservation({ created_at: null })] });
  expect(result.daily).toEqual({});
  expect(result.bySegment).toEqual({});
});

test("handles an empty/missing reservation list without throwing", () => {
  expect(() => runPickup({})).not.toThrow();
  expect(runPickup({ reservations: [] }).daily).toEqual({});
});
