import { runDynamicPricing } from "./dynamicPricing";

function reservation(overrides = {}) {
  return { id: 1, room_id: 1, arrival: "2026-09-01", departure: "2026-09-03", status: "confirmée", price: 100, ...overrides };
}

test("recommends the blended ADR unchanged when nothing pushes it up or down", () => {
  const result = runDynamicPricing({ reservations: [reservation({ price: 100 })], occupancy: 60, activeEvents: [] });
  expect(result.recommendedADR).toBe(100);
  expect(result.occupancyAdjustment).toBe(0);
  expect(result.weatherAdjustment).toBe(0);
  expect(result.eventAdjustment).toBe(0);
});

test("raises the recommendation when occupancy is high", () => {
  const result = runDynamicPricing({ reservations: [reservation({ price: 100 })], occupancy: 90 });
  expect(result.occupancyAdjustment).toBeGreaterThan(0);
  expect(result.recommendedADR).toBeGreaterThan(100);
});

test("lowers the recommendation when occupancy is low", () => {
  const result = runDynamicPricing({ reservations: [reservation({ price: 100 })], occupancy: 20 });
  expect(result.occupancyAdjustment).toBeLessThan(0);
  expect(result.recommendedADR).toBeLessThan(100);
});

test("a weather event with a positive revenue impact nudges price up", () => {
  const result = runDynamicPricing({
    reservations: [reservation({ price: 100 })],
    occupancy: 60,
    activeEvents: [{ id: "weather", impact: { revenue: 120 } }],
  });
  expect(result.weatherAdjustment).toBeGreaterThan(0);
});

test("a weather event with a negative revenue impact nudges price down", () => {
  const result = runDynamicPricing({
    reservations: [reservation({ price: 100 })],
    occupancy: 60,
    activeEvents: [{ id: "weather", impact: { revenue: -80 } }],
  });
  expect(result.weatherAdjustment).toBeLessThan(0);
});

test("an active local event or VIP guest raises the recommendation", () => {
  const result = runDynamicPricing({
    reservations: [reservation({ price: 100 })],
    occupancy: 60,
    activeEvents: [{ id: "local_event", impact: { revenue: 400 } }],
  });
  expect(result.eventAdjustment).toBeGreaterThan(0);
});

test("multiple demand-boosting events stack, up to the cap", () => {
  const result = runDynamicPricing({
    reservations: [reservation({ price: 100 })],
    occupancy: 60,
    activeEvents: [
      { id: "local_event", impact: { revenue: 400 } },
      { id: "vip_guest", impact: { revenue: 200 } },
      { id: "power_outage", impact: { revenue: -200 } }, // not a demand booster, ignored
    ],
  });
  expect(result.eventAdjustment).toBeCloseTo(0.1); // 2 boosters * 0.05
});

test("min/max price bracket the blended ADR", () => {
  const result = runDynamicPricing({ reservations: [reservation({ price: 100 })], occupancy: 60 });
  expect(result.minPrice).toBeLessThan(100);
  expect(result.maxPrice).toBeGreaterThan(100);
});

test("handles no reservations/events without throwing", () => {
  expect(() => runDynamicPricing({})).not.toThrow();
  expect(runDynamicPricing({ reservations: [] }).recommendedADR).toBe(0);
});
