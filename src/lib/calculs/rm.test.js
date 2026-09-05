import {
  channelYield,
  forecastAdvanced,
  pickupCurve,
  revpash,
  segmentation,
} from "./rm";

const reservations = [
  {
    status: "confirmée",
    arrival: "2026-09-01",
    departure: "2026-09-04",
    price: 150,
    segment: "Corporate",
    channel: "direct",
    created_at: "2026-08-01T10:00:00Z",
  },
  {
    status: "confirmée",
    arrival: "2026-09-10",
    departure: "2026-09-12",
    price: 90,
    segment: "OTA",
    channel: "ota",
    created_at: "2026-08-02T10:00:00Z",
  },
  {
    status: "confirmée",
    arrival: "2026-09-15",
    departure: "2026-09-16",
    price: 70,
    segment: "Groupes",
    channel: "agency",
    created_at: "2026-08-02T12:00:00Z",
  },
];

test("builds RM forecasts, advanced segments, pickup deltas, and channel yield", () => {
  const forecast = forecastAdvanced(reservations, 80);
  const segments = segmentation(reservations);
  const curve = pickupCurve(reservations);
  const yieldByChannel = channelYield(reservations);

  expect(forecast.next30).toBeGreaterThan(0);
  expect(forecast.next90).toBe(forecast.next30 * 3);
  expect(segments).toEqual({ corporate: 1, leisure: 0, ota: 1, groups: 1 });
  expect(curve[1].delta).toBe(1);
  expect(yieldByChannel.ota.netRevenue).toBe(148);
  expect(yieldByChannel.ota.yield).toBe("stable");
  expect(yieldByChannel.ota.recommendedAdr).toBe(90);
  expect(revpash({ avgTicket: 24, demand: 75 })).toBe(18);
});