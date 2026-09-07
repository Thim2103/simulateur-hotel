import {
  channelYield,
  forecastAdvanced,
  forecastEngine,
  pickupCurve,
  bookingPace,
  pickupTrend,
  revpash,
  integratedHotelReputation,
  restaurantRevenue,
  segmentation,
  segmentPerformance,
  segmentMixImpact,
  buildRMKpis,
  forecastPlaceholder,
  normalizeRMData,
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
  expect(restaurantRevenue({ totalMonthlyRevenue: 41800 })).toBe(41800);
  expect(integratedHotelReputation({ customerSatisfaction: 4.5, demand: 80 })).toBe(70);
});

test("normalizes Supabase rows and exposes structured KPI placeholders", () => {
  const data = normalizeRMData({
    rooms: [{ id: 1 }],
    reservations: [{ check_in: "2026-09-01", check_out: "2026-09-02", rate: "125", status: "confirmed" }],
  });

  expect(data.reservations[0]).toMatchObject({
    arrival: "2026-09-01",
    departure: "2026-09-02",
    price: 125,
  });
  expect(buildRMKpis(data.rooms, data.reservations)).toMatchObject({
    adr: 125,
    revpar: 125,
    occupancy: 100,
    source: "supabase",
  });
  expect(forecastPlaceholder()).toMatchObject({
    next30: null,
    next90: null,
    status: "pending",
  });
});

test("forecast engine builds 30/90-day demand curves with seasonality and occupancy adjustment", () => {
  const rooms = [{ id: 1 }, { id: 2 }];
  const forecast = forecastEngine(reservations, rooms, 80);

  expect(forecast.status).toBe("ready");
  expect(forecast.daily30).toHaveLength(30);
  expect(forecast.daily90).toHaveLength(90);
  expect(forecast.next90).toBeGreaterThanOrEqual(forecast.next30);
  expect(Object.keys(forecast.seasonality)).toEqual(["dim", "lun", "mar", "mer", "jeu", "ven", "sam"]);
});

test("segment mix impact reports revenue share and ADR delta per segment", () => {
  const performance = segmentPerformance(reservations);
  const mixImpact = segmentMixImpact(reservations);

  expect(performance.corporate.mixShare).toBeGreaterThan(0);
  expect(mixImpact.bySegment.corporate.adr).toBe(performance.corporate.adr);
  expect(mixImpact.blendedAdr).toBeGreaterThan(0);
});

test("channel yield exposes BAR logic, OTA uplift, corporate negotiated rate, and dynamic pricing", () => {
  const yieldByChannel = channelYield(reservations, 85);

  expect(yieldByChannel.direct.barRate).toBe(yieldByChannel.direct.adr);
  expect(yieldByChannel.ota.strategyRate).toBe(Math.round(yieldByChannel.direct.adr * 1.15));
  expect(yieldByChannel.agency.strategyRate).toBe(Math.round(yieldByChannel.direct.adr * 0.92));
  expect(yieldByChannel.ota.dynamicRate).toBe(Math.round(yieldByChannel.ota.strategyRate * 1.08));
});

test("booking pace and pickup trend summarize reservation creation velocity", () => {
  expect(bookingPace(reservations)).toMatchObject({ cumulative: 3, days: 2 });
  expect(["up", "down", "stable"]).toContain(pickupTrend(reservations));
});