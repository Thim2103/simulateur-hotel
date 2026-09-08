import { applyStaffDecision, findStaffAction, STAFF_ACTION_CATALOG } from "./staffActions";

function bundleFixture() {
  return {
    hotelState: { finance: { payroll: 38000 }, esg: { sustainabilityScore: 58 } },
    restaurantState: {
      staff: [
        { id: 1, name: "A", salary: 2000, productivity: 60, satisfaction: 60 },
        { id: 2, name: "B", salary: 3000, productivity: 80, satisfaction: 70 },
      ],
      finance: { fixedCosts: 6200 },
      esg: { staffWellbeing: 70, monthlyInvestment: 900 },
    },
    rooms: [{ id: 1 }],
    reservations: [],
  };
}

test("findStaffAction resolves a known id and returns null for an unknown one", () => {
  expect(findStaffAction("recruter")).not.toBeNull();
  expect(findStaffAction("does-not-exist")).toBeNull();
});

test("every catalog action applies without throwing and without mutating the input", () => {
  STAFF_ACTION_CATALOG.forEach((action) => {
    const bundle = bundleFixture();
    const frozenCopy = JSON.parse(JSON.stringify(bundle));
    const next = applyStaffDecision(bundle, action.id);
    expect(next).toBeDefined();
    expect(bundle).toEqual(frozenCopy);
  });
});

test("recruter adds a restaurant staff member and increases hotel payroll", () => {
  const bundle = bundleFixture();
  const next = applyStaffDecision(bundle, "recruter");
  expect(next.restaurantState.staff).toHaveLength(3);
  expect(next.hotelState.finance.payroll).toBeGreaterThan(bundle.hotelState.finance.payroll);
});

test("former increases every staff member's productivity", () => {
  const bundle = bundleFixture();
  const next = applyStaffDecision(bundle, "former");
  next.restaurantState.staff.forEach((person, index) => {
    expect(person.productivity).toBeGreaterThan(bundle.restaurantState.staff[index].productivity);
  });
});

test("promouvoir raises the top performer's salary and satisfaction", () => {
  const bundle = bundleFixture();
  const next = applyStaffDecision(bundle, "promouvoir");
  const promoted = next.restaurantState.staff.find((p) => p.id === 2); // highest productivity in the fixture
  expect(promoted.salary).toBeGreaterThan(3000);
  expect(promoted.satisfaction).toBeGreaterThan(70);
});

test("reorganiser raises satisfaction for the whole team", () => {
  const bundle = bundleFixture();
  const next = applyStaffDecision(bundle, "reorganiser");
  next.restaurantState.staff.forEach((person, index) => {
    expect(person.satisfaction).toBeGreaterThan(bundle.restaurantState.staff[index].satisfaction);
  });
});

test("reduire-surcharge increases hotel payroll without touching restaurant staff", () => {
  const bundle = bundleFixture();
  const next = applyStaffDecision(bundle, "reduire-surcharge");
  expect(next.hotelState.finance.payroll).toBeGreaterThan(bundle.hotelState.finance.payroll);
  expect(next.restaurantState.staff).toEqual(bundle.restaurantState.staff);
});

test("ameliorer-bien-etre raises ESG wellbeing figures on both sides", () => {
  const bundle = bundleFixture();
  const next = applyStaffDecision(bundle, "ameliorer-bien-etre");
  expect(next.restaurantState.esg.staffWellbeing).toBeGreaterThan(bundle.restaurantState.esg.staffWellbeing);
  expect(next.hotelState.esg.sustainabilityScore).toBeGreaterThan(bundle.hotelState.esg.sustainabilityScore);
});

test("an unknown action id returns the bundle unchanged", () => {
  const bundle = bundleFixture();
  expect(applyStaffDecision(bundle, "unknown-action")).toEqual(bundle);
});
