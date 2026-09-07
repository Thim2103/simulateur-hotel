import { restaurantRushEvent } from "./restaurantRush";

test("conditions() requires at least one menu item", () => {
  expect(restaurantRushEvent.conditions({ restaurantState: { menu: [{ id: 1 }] } })).toBe(true);
  expect(restaurantRushEvent.conditions({ restaurantState: { menu: [] } })).toBe(false);
  expect(restaurantRushEvent.conditions({ restaurantState: {} })).toBe(false);
});

test("probability() is higher when there are no open complaints", () => {
  const noComplaints = restaurantRushEvent.probability({ restaurantState: { operations: [] } });
  const withComplaints = restaurantRushEvent.probability({ restaurantState: { operations: [{ type: "complaint" }] } });
  expect(noComplaints).toBeGreaterThan(withComplaints);
});

test("apply() returns a message with medium severity", () => {
  const applied = restaurantRushEvent.apply({}, {});
  expect(applied.message).toMatch(/affluence/i);
  expect(applied.severity).toBe("medium");
});

test("impact boosts revenue but costs staff fatigue, for a single day", () => {
  expect(restaurantRushEvent.impact).toEqual({ revenue: 300, expenses: 80, staff: -2, reputation: 1 });
  expect(restaurantRushEvent.duration).toBe(1);
});
