import { weatherEvent, weatherVariants } from "./weather";

const STATE = { hotelState: {}, restaurantState: {}, pmsState: {} };

test("conditions() is always true and probability() is fixed", () => {
  expect(weatherEvent.conditions(STATE)).toBe(true);
  expect(weatherEvent.probability(STATE)).toBe(0.35);
});

test("apply() picks a variant, stores it on the context, and returns a message/severity", () => {
  const context = { rng: () => 0 }; // picks the first (highest-weight) variant: sun
  const applied = weatherEvent.apply(STATE, context);

  expect(context.variant.id).toBe("sun");
  expect(applied.message).toMatch(/grand soleil/i);
  expect(applied.severity).toBe("low");
});

test("impact() and duration() reflect whichever variant was picked", () => {
  const context = { rng: () => 0.99 }; // last (lowest-weight) variant: storm
  weatherEvent.apply(STATE, context);

  expect(context.variant.id).toBe("storm");
  expect(weatherEvent.impact(STATE, context)).toEqual({ revenue: -250, expenses: 300, staff: -2, reputation: -1 });
  expect(weatherEvent.duration(STATE, context)).toBe(2);
});

test("every documented variant (pluie, soleil, canicule, tempête) is reachable", () => {
  const ids = weatherVariants.map((variant) => variant.id);
  expect(ids.sort()).toEqual(["heatwave", "rain", "storm", "sun"]);
});
