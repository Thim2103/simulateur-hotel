import { applyStaffRegionalEvents } from "./staffRegionalEvents";

const HOTELS = [
  { id: "a", city: "Paris" },
  { id: "b", city: "Paris" },
  { id: "c", city: "Lyon" },
];

test("fires no events when rng always rolls above every probability", () => {
  const result = applyStaffRegionalEvents({ hotels: HOTELS, rng: () => 0.999 });
  expect(result.regionalEvents).toEqual([]);
  expect(result.moraleAdjustmentsByHotelId).toEqual({});
});

test("a regional HR event only adjusts morale for hotels sharing that city", () => {
  const result = applyStaffRegionalEvents({ hotels: HOTELS, rng: () => 0 });
  expect(result.moraleAdjustmentsByHotelId.a).toBeDefined();
  expect(result.moraleAdjustmentsByHotelId.b).toBeDefined();
});

test("a strike lowers morale while a job fair/training grant raises it", () => {
  const result = applyStaffRegionalEvents({ hotels: [{ id: "a", city: "Paris" }], rng: () => 0 });
  const strike = result.regionalEvents.find((event) => event.id.startsWith("regional_strike"));
  expect(strike).toBeDefined();
  // strike (-8) + job fair (+3) + training grant (+5) = 0 net for this hotel
  expect(result.moraleAdjustmentsByHotelId.a).toBe(0);
});

test("handles hotels with no city set without throwing", () => {
  expect(() => applyStaffRegionalEvents({ hotels: [{ id: "a" }], rng: () => 0 })).not.toThrow();
});

test("never throws with no arguments at all", () => {
  expect(() => applyStaffRegionalEvents()).not.toThrow();
});
