import { applyEvents, dailyEventCatalog } from "./applyEvents";

test("fires no events when rng always rolls above every probability", () => {
  const result = applyEvents({ hotelState: {}, restaurantState: {}, rng: () => 0.999 });
  expect(result.events).toEqual([]);
  expect(result.impacts).toEqual({ revenue: 0, cost: 0, demand: 0, satisfaction: 0, reputation: 0 });
});

test("fires every event when rng always rolls below every probability", () => {
  // negative_review/positive_review only have a nonzero probability when
  // there's at least one complaint on record; staff_sick_leave needs staff.
  const result = applyEvents({ hotelState: {}, restaurantState: { operations: [{ type: "complaint" }], staff: [{ id: 1 }] }, rng: () => 0 });
  expect(result.events.map((event) => event.id).sort()).toEqual([...dailyEventCatalog].sort());
});

test("combines the impact of every triggered event", () => {
  const result = applyEvents({ hotelState: {}, restaurantState: { operations: [{ type: "complaint" }], staff: [{ id: 1 }] }, rng: () => 0 });
  const expectedCost = result.events.reduce((sum, event) => sum + (event.impact.cost || 0), 0);
  expect(result.impacts.cost).toBe(expectedCost);
});

test("negative_review is more likely when the restaurant has open complaints", () => {
  const withComplaints = applyEvents({
    hotelState: {},
    restaurantState: { operations: [{ type: "complaint" }, { type: "complaint" }] },
    rng: () => 0.2,
  });
  const withoutComplaints = applyEvents({ hotelState: {}, restaurantState: { operations: [] }, rng: () => 0.2 });

  expect(withComplaints.events.some((event) => event.id === "negative_review")).toBe(true);
  expect(withoutComplaints.events.some((event) => event.id === "negative_review")).toBe(false);
});

test("staff_sick_leave never fires when the restaurant has no staff", () => {
  const result = applyEvents({ hotelState: {}, restaurantState: { staff: [] }, rng: () => 0 });
  expect(result.events.some((event) => event.id === "staff_sick_leave")).toBe(false);
});

test("never throws with no state at all", () => {
  expect(() => applyEvents()).not.toThrow();
});
