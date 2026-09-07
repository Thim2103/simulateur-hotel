import { deriveRestaurantImpact } from "./restaurantEvents";

function event(overrides = {}) {
  return { id: "restaurant_rush", name: "Rush restaurant", category: "restaurant", severity: "medium", message: "Rush du service", ...overrides };
}

test("ignores events outside the restaurant/compliance/facilities categories", () => {
  const impact = deriveRestaurantImpact([event({ category: "weather" }), event({ category: "hr" })]);
  expect(impact.relevantEvents).toEqual([]);
  expect(impact.complaintsDelta).toBe(0);
  expect(impact.maintenanceDelta).toBe(0);
});

test("a restaurant/compliance event raises complaintsDelta by its severity weight", () => {
  const impact = deriveRestaurantImpact([event({ category: "restaurant", severity: "high" })]);
  expect(impact.complaintsDelta).toBe(3);
  expect(impact.maintenanceDelta).toBe(0);
});

test("a facilities event raises maintenanceDelta, weighted by severity", () => {
  const impact = deriveRestaurantImpact([event({ id: "technical_incident", category: "facilities", severity: "low" })]);
  expect(impact.maintenanceDelta).toBe(5);
  expect(impact.complaintsDelta).toBe(0);
});

test("only restaurant_rush events raise demandDelta", () => {
  const impact = deriveRestaurantImpact([event({ id: "restaurant_rush" }), event({ id: "health_inspection", category: "compliance" })]);
  expect(impact.demandDelta).toBe(12);
});

test("builds one task per relevant event, typed by category", () => {
  const impact = deriveRestaurantImpact([
    event({ id: "restaurant_rush", category: "restaurant", severity: "high" }),
    event({ id: "technical_incident", category: "facilities", severity: "medium" }),
  ]);
  expect(impact.tasksToCreate).toHaveLength(2);
  expect(impact.tasksToCreate[0]).toEqual(expect.objectContaining({ type: "complaint", priority: "haute", sourceEventId: "restaurant_rush" }));
  expect(impact.tasksToCreate[1]).toEqual(expect.objectContaining({ type: "maintenance", sourceEventId: "technical_incident" }));
});
