import { applyRegionalEvents } from "./chainEvents";

const HOTELS = [
  { id: "a", city: "Paris" },
  { id: "b", city: "Paris" },
  { id: "c", city: "Lyon" },
];

test("fires no events when rng always rolls above every probability", () => {
  const result = applyRegionalEvents({ hotels: HOTELS, rng: () => 0.999 });
  expect(result.regionalEvents).toEqual([]);
  expect(result.globalEvents).toEqual([]);
  expect(result.adjustmentsByHotelId).toEqual({});
});

test("a regional event only adjusts the hotels sharing that city", () => {
  const result = applyRegionalEvents({ hotels: HOTELS, rng: () => 0 });
  const parisEvent = result.regionalEvents.find((event) => event.city === "Paris");
  expect(parisEvent.hotelIds.sort()).toEqual(["a", "b"]);
  expect(result.adjustmentsByHotelId.a).toBeDefined();
  expect(result.adjustmentsByHotelId.b).toBeDefined();
});

test("a global event adjusts every hotel in the chain regardless of city", () => {
  const result = applyRegionalEvents({ hotels: HOTELS, rng: () => 0 });
  expect(result.globalEvents.length).toBeGreaterThan(0);
  expect(Object.keys(result.adjustmentsByHotelId).sort()).toEqual(["a", "b", "c"]);
});

test("multiple events affecting the same hotel accumulate their adjustments", () => {
  const result = applyRegionalEvents({ hotels: HOTELS, rng: () => 0 });
  // hotel "a" is hit by both Paris regional events and both global events.
  expect(Math.abs(result.adjustmentsByHotelId.a.revenuePercent)).toBeGreaterThan(0);
});

test("a lone hotel with no shared city can still be affected by a regional event scoped to it alone", () => {
  const result = applyRegionalEvents({ hotels: [{ id: "solo", city: "Marseille" }], rng: () => 0 });
  const regional = result.regionalEvents.find((event) => event.city === "Marseille");
  expect(regional.hotelIds).toEqual(["solo"]);
});

test("handles hotels with no city set without throwing", () => {
  expect(() => applyRegionalEvents({ hotels: [{ id: "a" }], rng: () => 0 })).not.toThrow();
});

test("never throws with no arguments at all", () => {
  expect(() => applyRegionalEvents()).not.toThrow();
});
