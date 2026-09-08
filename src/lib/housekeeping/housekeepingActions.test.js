import { applyHousekeepingDecision, findHousekeepingAction, HOUSEKEEPING_ACTION_CATALOG } from "./housekeepingActions";

function bundleFixture() {
  return {
    hotelState: {
      finance: { payroll: 38000 },
      housekeeping: { staffingBonus: 0, trainingLevel: 50, processEfficiency: 50 },
    },
    restaurantState: {},
    rooms: [{ id: 1 }],
    reservations: [],
  };
}

test("findHousekeepingAction resolves a known id and returns null for an unknown one", () => {
  expect(findHousekeepingAction("reorganiser-planning")).not.toBeNull();
  expect(findHousekeepingAction("does-not-exist")).toBeNull();
});

test("every catalog action applies without throwing and without mutating the input", () => {
  HOUSEKEEPING_ACTION_CATALOG.forEach((action) => {
    const bundle = bundleFixture();
    const frozenCopy = JSON.parse(JSON.stringify(bundle));
    expect(() => applyHousekeepingDecision(bundle, action.id)).not.toThrow();
    expect(bundle).toEqual(frozenCopy);
  });
});

test("reorganiser-planning raises process efficiency", () => {
  const bundle = bundleFixture();
  const next = applyHousekeepingDecision(bundle, "reorganiser-planning");
  expect(next.hotelState.housekeeping.processEfficiency).toBeGreaterThan(50);
});

test("reduire-surcharge raises the temporary staffing bonus", () => {
  const bundle = bundleFixture();
  const next = applyHousekeepingDecision(bundle, "reduire-surcharge");
  expect(next.hotelState.housekeeping.staffingBonus).toBe(1);
});

test("augmenter-staff raises the staffing bonus permanently and increases payroll", () => {
  const bundle = bundleFixture();
  const next = applyHousekeepingDecision(bundle, "augmenter-staff");
  expect(next.hotelState.housekeeping.staffingBonus).toBe(1);
  expect(next.hotelState.finance.payroll).toBeGreaterThan(38000);
});

test("ameliorer-qualite raises the training level", () => {
  const bundle = bundleFixture();
  const next = applyHousekeepingDecision(bundle, "ameliorer-qualite");
  expect(next.hotelState.housekeeping.trainingLevel).toBeGreaterThan(50);
});

test("optimiser-temps-nettoyage raises process efficiency", () => {
  const bundle = bundleFixture();
  const next = applyHousekeepingDecision(bundle, "optimiser-temps-nettoyage");
  expect(next.hotelState.housekeeping.processEfficiency).toBeGreaterThan(50);
});

test("works even when hotelState.housekeeping doesn't exist yet", () => {
  const bundle = { hotelState: { finance: {} }, restaurantState: {}, rooms: [], reservations: [] };
  expect(() => applyHousekeepingDecision(bundle, "ameliorer-qualite")).not.toThrow();
  const next = applyHousekeepingDecision(bundle, "ameliorer-qualite");
  expect(next.hotelState.housekeeping.trainingLevel).toBe(58);
});

test("an unknown action id returns the bundle unchanged", () => {
  const bundle = bundleFixture();
  expect(applyHousekeepingDecision(bundle, "unknown-action")).toEqual(bundle);
});
