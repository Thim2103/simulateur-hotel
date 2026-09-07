import { healthInspectionEvent } from "./healthInspection";

test("conditions() always allows the inspection, probability() is low", () => {
  expect(healthInspectionEvent.conditions({})).toBe(true);
  expect(healthInspectionEvent.probability({})).toBe(0.03);
});

test("apply() passes with high staff satisfaction and a favorable roll", () => {
  const state = { restaurantState: { staff: [{ satisfaction: 90 }, { satisfaction: 90 }] } };
  const context = { rng: () => 0.5 }; // (0.5 - 0.5) * 30 = 0 -> score stays 90
  const applied = healthInspectionEvent.apply(state, context);

  expect(context.variant.passed).toBe(true);
  expect(applied.severity).toBe("low");
  expect(applied.message).toMatch(/réussie/i);
});

test("apply() fails with low staff satisfaction and an unfavorable roll", () => {
  const state = { restaurantState: { staff: [{ satisfaction: 10 }] } };
  const context = { rng: () => 0 }; // (0 - 0.5) * 30 = -15 -> score = -5
  const applied = healthInspectionEvent.apply(state, context);

  expect(context.variant.passed).toBe(false);
  expect(applied.severity).toBe("high");
  expect(applied.message).toMatch(/non-conformités/i);
});

test("defaults to a neutral score (50) with no staff on record", () => {
  const context = { rng: () => 0.5 };
  healthInspectionEvent.apply({ restaurantState: { staff: [] } }, context);
  expect(context.variant.passed).toBe(false); // score stays at 50, just under the 55 threshold
});

test("a pass boosts reputation for a single day; a fail costs money and reputation for longer", () => {
  const passContext = { variant: { passed: true } };
  const failContext = { variant: { passed: false } };

  expect(healthInspectionEvent.impact({}, passContext)).toEqual({ revenue: 0, expenses: 0, staff: 0, reputation: 3 });
  expect(healthInspectionEvent.duration({}, passContext)).toBe(1);

  expect(healthInspectionEvent.impact({}, failContext)).toEqual({ revenue: -150, expenses: 500, staff: 0, reputation: -8 });
  expect(healthInspectionEvent.duration({}, failContext)).toBe(3);
});
