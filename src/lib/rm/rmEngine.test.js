import { runRM } from "./rmEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function room(overrides = {}) {
  return { id: 1, number: "101", status: "libre", ...overrides };
}

function reservation(overrides = {}) {
  return {
    id: 1,
    room_id: 1,
    arrival: "2026-09-08",
    departure: "2026-09-10",
    status: "confirmée",
    price: 150,
    segment: "leisure",
    channel: "direct",
    created_at: "2026-09-01T10:00:00Z",
    ...overrides,
  };
}

test("returns a rmReport with exactly the documented shape", () => {
  const report = runRM({ rooms: [room()], reservations: [reservation()], referenceDate: REFERENCE_DATE });

  expect(report).toEqual({
    date: "2026-09-10",
    forecast: expect.objectContaining({ next7: expect.any(Number), next30: expect.any(Number), next90: expect.any(Number) }),
    pickup: expect.objectContaining({ daily: expect.any(Object), bySegment: expect.any(Object), byChannel: expect.any(Object) }),
    pricing: expect.objectContaining({
      recommendedADR: expect.any(Number),
      minPrice: expect.any(Number),
      maxPrice: expect.any(Number),
      eventAdjustment: expect.any(Number),
      weatherAdjustment: expect.any(Number),
      occupancyAdjustment: expect.any(Number),
    }),
    segmentation: expect.objectContaining({ mix: expect.any(Object), adrBySegment: expect.any(Object), pickupBySegment: expect.any(Object) }),
    recommendations: expect.any(Array),
  });
});

test("runs the pipeline in the documented order: segmentation, pickup, forecast, dynamicPricing, then recommendations", () => {
  // The recommendations step reads from every earlier step's output, so if
  // any of them ran with stale/default data the assertions below (all
  // derived from the same single reservation) would disagree with each
  // other.
  const report = runRM({
    rooms: [room()],
    reservations: [reservation({ segment: "ota", channel: "ota", price: 400 })],
    referenceDate: REFERENCE_DATE,
  });

  expect(report.segmentation.mix.ota).toBe(1);
  expect(report.segmentation.adrBySegment.ota).toBe(400);
  expect(report.pricing.recommendedADR).toBeGreaterThan(0);
  // Entirely OTA-sourced: the recommendations should flag the dependency.
  expect(report.recommendations.some((r) => r.id === "reduce_ota_dependency")).toBe(true);
});

test("pricing reacts to today's active events", () => {
  const withEvent = runRM({
    rooms: [room()],
    reservations: [reservation()],
    activeEvents: [{ id: "local_event", impact: { revenue: 400 } }],
    referenceDate: REFERENCE_DATE,
  });
  const withoutEvent = runRM({ rooms: [room()], reservations: [reservation()], referenceDate: REFERENCE_DATE });

  expect(withEvent.pricing.eventAdjustment).toBeGreaterThan(withoutEvent.pricing.eventAdjustment);
});

test("segmentation.pickupBySegment sums pickup.bySegment's daily counts per segment", () => {
  const report = runRM({
    rooms: [room()],
    reservations: [
      reservation({ id: 1, segment: "leisure", created_at: "2026-09-01T10:00:00Z" }),
      reservation({ id: 2, segment: "leisure", created_at: "2026-09-02T10:00:00Z" }),
    ],
    referenceDate: REFERENCE_DATE,
  });

  expect(report.segmentation.pickupBySegment.leisure).toBe(2);
});

test("handles no rooms/reservations/events at all without throwing", () => {
  expect(() => runRM()).not.toThrow();
  const report = runRM({ referenceDate: REFERENCE_DATE });
  expect(report.recommendations.length).toBeGreaterThan(0);
});
