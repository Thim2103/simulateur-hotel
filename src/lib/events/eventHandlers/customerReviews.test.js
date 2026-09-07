import { customerReviewsEvent } from "./customerReviews";

test("conditions() is always true and probability() is fixed", () => {
  expect(customerReviewsEvent.conditions({})).toBe(true);
  expect(customerReviewsEvent.probability({})).toBe(0.2);
});

test("apply() favors a positive review when there are no open complaints", () => {
  const state = { restaurantState: { operations: [] } };
  const context = { rng: () => 0.5 }; // well inside the positive share (80/100) with no complaints
  const applied = customerReviewsEvent.apply(state, context);

  expect(context.variant.id).toBe("positive");
  expect(applied.severity).toBe("low");
});

test("apply() favors a negative review when there are open complaints", () => {
  const state = { restaurantState: { operations: [{ type: "complaint" }] } };
  const context = { rng: () => 0.5 }; // well inside the negative share (75/100) with a complaint
  const applied = customerReviewsEvent.apply(state, context);

  expect(context.variant.id).toBe("negative");
  expect(applied.severity).toBe("medium");
});

test("impact()/duration() reflect whichever variant was picked", () => {
  const positiveContext = { variant: { impact: { revenue: 50, reputation: 3 } } };
  const negativeContext = { variant: { impact: { revenue: -60, reputation: -4 } } };

  expect(customerReviewsEvent.impact({}, positiveContext)).toEqual({ revenue: 50, reputation: 3 });
  expect(customerReviewsEvent.impact({}, negativeContext)).toEqual({ revenue: -60, reputation: -4 });
  expect(customerReviewsEvent.duration).toBe(1);
});
