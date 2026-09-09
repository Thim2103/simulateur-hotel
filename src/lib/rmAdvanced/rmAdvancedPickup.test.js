import { computePickupCurves } from "./rmAdvancedPickup";

function reservation({ createdAt, arrival, status = "confirmed" }) {
  return { status, created_at: createdAt, arrival };
}

test("returns an empty curve when there is nothing to compute from", () => {
  expect(computePickupCurves({ reservations: [] })).toEqual({ curve: [], momentum: null });
});

test("computes cumulative booked % per lead-time bucket", () => {
  const reservations = [
    reservation({ createdAt: "2026-08-17", arrival: "2026-09-16" }), // lead time 30
    reservation({ createdAt: "2026-09-09", arrival: "2026-09-16" }), // lead time 7
    reservation({ createdAt: "2026-09-16", arrival: "2026-09-16" }), // lead time 0
  ];
  const result = computePickupCurves({ reservations });

  const bucket30 = result.curve.find((entry) => entry.leadTimeDays === 30);
  const bucket7 = result.curve.find((entry) => entry.leadTimeDays === 7);
  const bucket0 = result.curve.find((entry) => entry.leadTimeDays === 0);

  expect(bucket30.bookedPct).toBe(33); // only the lead-time-30 booking was made >= 30 days out
  expect(bucket7.bookedPct).toBe(67); // lead-time 30 and 7 bookings were made >= 7 days out
  expect(bucket0.bookedPct).toBe(100); // all three were eventually made >= 0 days out
});

test("ignores unconfirmed reservations", () => {
  const reservations = [reservation({ createdAt: "2026-09-16", arrival: "2026-09-16", status: "cancelled" })];
  expect(computePickupCurves({ reservations })).toEqual({ curve: [], momentum: null });
});

test("momentum is positive when pickup accelerates close to arrival", () => {
  const reservations = Array.from({ length: 5 }, () => reservation({ createdAt: "2026-09-09", arrival: "2026-09-16" })); // lead time 7
  const result = computePickupCurves({ reservations });
  expect(result.momentum).toBeGreaterThan(0);
});
