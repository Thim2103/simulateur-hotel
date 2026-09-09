import { computeCompression } from "./rmAdvancedCompression";

const referenceDate = new Date("2026-09-16T00:00:00Z");

function rooms(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `r${index + 1}` }));
}

test("returns an empty-safe result when there are no rooms", () => {
  const result = computeCompression({ rooms: [], reservations: [], referenceDate, horizonDays: 3 });
  expect(result.byDate).toHaveLength(3);
  expect(result.byDate.every((entry) => entry.occupancyRate === 0)).toBe(true);
});

test("computes occupancy per date from confirmed reservations", () => {
  const reservations = [
    { room_id: "r1", status: "confirmed", arrival: "2026-09-16", departure: "2026-09-18" },
    { room_id: "r2", status: "confirmed", arrival: "2026-09-17", departure: "2026-09-18" },
  ];
  const result = computeCompression({ rooms: rooms(2), reservations, referenceDate, horizonDays: 3 });

  expect(result.byDate[0].occupancyRate).toBe(50); // 2026-09-16: only r1
  expect(result.byDate[1].occupancyRate).toBe(100); // 2026-09-17: r1 + r2
  expect(result.byDate[2].occupancyRate).toBe(0); // 2026-09-18: both checked out
});

test("ignores unconfirmed reservations", () => {
  const reservations = [{ room_id: "r1", status: "cancelled", arrival: "2026-09-16", departure: "2026-09-18" }];
  const result = computeCompression({ rooms: rooms(2), reservations, referenceDate, horizonDays: 1 });
  expect(result.byDate[0].occupancyRate).toBe(0);
});

test("flags high-compression and low-occupancy dates", () => {
  const reservations = [
    { room_id: "r1", status: "confirmed", arrival: "2026-09-16", departure: "2026-09-17" },
    { room_id: "r2", status: "confirmed", arrival: "2026-09-16", departure: "2026-09-17" },
  ];
  const result = computeCompression({ rooms: rooms(2), reservations, referenceDate, horizonDays: 2 });
  expect(result.highCompressionDates).toContain("2026-09-16");
  expect(result.lowOccupancyDates).toContain("2026-09-17");
});

test("computes the average compression across the horizon", () => {
  const reservations = [{ room_id: "r1", status: "confirmed", arrival: "2026-09-16", departure: "2026-09-18" }];
  const result = computeCompression({ rooms: rooms(2), reservations, referenceDate, horizonDays: 2 });
  expect(result.avgCompression).toBe(50);
});
