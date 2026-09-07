import { calculateHotelRevenue } from "./calculateHotelRevenue";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function reservation(overrides = {}) {
  return {
    id: 1,
    room_id: 1,
    arrival: "2026-09-09",
    departure: "2026-09-12",
    status: "confirmée",
    price: 150,
    channel: "direct",
    ...overrides,
  };
}

test("counts only confirmed reservations active on the reference day", () => {
  const result = calculateHotelRevenue({
    reservations: [
      reservation({ id: 1, room_id: 1, status: "confirmée" }),
      reservation({ id: 2, room_id: 2, status: "annulée" }),
      reservation({ id: 3, room_id: 3, arrival: "2026-09-15", departure: "2026-09-17" }), // not active yet
    ],
    referenceDate: REFERENCE_DATE,
  });

  expect(result.occupiedRooms).toBe(1);
  expect(result.roomRevenue).toBe(150);
});

test("adds a flat upsell revenue per occupied room", () => {
  const result = calculateHotelRevenue({
    reservations: [reservation({ id: 1, room_id: 1 }), reservation({ id: 2, room_id: 2 })],
    referenceDate: REFERENCE_DATE,
  });

  expect(result.occupiedRooms).toBe(2);
  expect(result.upsellRevenue).toBe(2 * 14);
});

test("deducts an OTA commission only for OTA-channel bookings", () => {
  const direct = calculateHotelRevenue({ reservations: [reservation({ channel: "direct" })], referenceDate: REFERENCE_DATE });
  const ota = calculateHotelRevenue({ reservations: [reservation({ channel: "ota" })], referenceDate: REFERENCE_DATE });

  expect(direct.otaCommission).toBe(0);
  expect(ota.otaCommission).toBe(Math.round(150 * 0.18));
  expect(ota.netRevenue).toBeLessThan(direct.netRevenue);
});

test("net revenue is room + upsell - commission", () => {
  const result = calculateHotelRevenue({ reservations: [reservation({ channel: "ota" })], referenceDate: REFERENCE_DATE });
  expect(result.netRevenue).toBe(result.roomRevenue + result.upsellRevenue - result.otaCommission);
});

test("returns zero revenue for an empty or missing reservation list", () => {
  expect(calculateHotelRevenue({ referenceDate: REFERENCE_DATE })).toMatchObject({ occupiedRooms: 0, roomRevenue: 0, upsellRevenue: 0, otaCommission: 0, netRevenue: 0 });
});
