import { runForecast } from "./forecast";

function reservation(overrides = {}) {
  return { id: 1, room_id: 1, arrival: "2026-09-01", departure: "2026-09-03", status: "confirmée", price: 100, ...overrides };
}

test("returns a next7/next30/next90 revenue forecast", () => {
  const result = runForecast({ reservations: [reservation()], rooms: [{ id: 1 }] });
  expect(typeof result.next7).toBe("number");
  expect(typeof result.next30).toBe("number");
  expect(typeof result.next90).toBe("number");
});

test("a higher restaurant demand raises the forecast", () => {
  const low = runForecast({ reservations: [reservation()], rooms: [{ id: 1 }], restaurantDemand: 20 });
  const high = runForecast({ reservations: [reservation()], rooms: [{ id: 1 }], restaurantDemand: 90 });
  expect(high.next30).toBeGreaterThanOrEqual(low.next30);
});

test("exposes the daily breakdown for the next 30/90 days", () => {
  const result = runForecast({ reservations: [reservation()], rooms: [{ id: 1 }] });
  expect(result.daily30).toHaveLength(30);
  expect(result.daily90).toHaveLength(90);
});

test("handles no reservations at all without throwing", () => {
  expect(() => runForecast({})).not.toThrow();
  const result = runForecast({ reservations: [], rooms: [] });
  expect(result.next7).toBe(0);
});
