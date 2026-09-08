import { applyQuickAction, findQuickAction, QUICK_ACTION_CATALOG } from "./dashboardActions";

function bundle() {
  return {
    hotelState: { marketing: { budget: 1000 } },
    restaurantState: { staff: [{ id: 1, satisfaction: 60 }], operations: [] },
    rooms: [{ id: 1 }],
    reservations: [{ id: 1, room_id: 1, price: 100 }],
  };
}

test("QUICK_ACTION_CATALOG covers pricing, staff, marketing and operations", () => {
  const categories = QUICK_ACTION_CATALOG.map((a) => a.category);
  expect(categories).toEqual(expect.arrayContaining(["pricing", "staff", "marketing", "operations"]));
});

test("findQuickAction looks up an action by id", () => {
  expect(findQuickAction("increase-prices").category).toBe("pricing");
  expect(findQuickAction("does-not-exist")).toBeNull();
});

test("increase-prices raises every reservation's price by 5% by default", () => {
  const next = applyQuickAction(bundle(), "increase-prices");
  expect(next.reservations[0].price).toBe(105);
});

test("decrease-prices lowers every reservation's price and never goes below 0", () => {
  const next = applyQuickAction(bundle(), "decrease-prices", { percent: 200 });
  expect(next.reservations[0].price).toBe(0);
});

test("boost-staff-morale raises restaurant staff satisfaction, capped at 100", () => {
  const next = applyQuickAction(bundle(), "boost-staff-morale", { amount: 50 });
  expect(next.restaurantState.staff[0].satisfaction).toBe(100);
});

test("increase-marketing raises the hotel's marketing budget", () => {
  const next = applyQuickAction(bundle(), "increase-marketing", { amount: 300 });
  expect(next.hotelState.marketing.budget).toBe(1300);
});

test("schedule-maintenance appends a maintenance task to restaurant operations", () => {
  const next = applyQuickAction(bundle(), "schedule-maintenance");
  expect(next.restaurantState.operations).toHaveLength(1);
  expect(next.restaurantState.operations[0].type).toBe("maintenance");
});

test("an unknown action id returns the bundle unchanged", () => {
  const source = bundle();
  expect(applyQuickAction(source, "does-not-exist")).toEqual(source);
});

test("never mutates the input bundle", () => {
  const source = bundle();
  applyQuickAction(source, "increase-prices");
  expect(source.reservations[0].price).toBe(100);
});
