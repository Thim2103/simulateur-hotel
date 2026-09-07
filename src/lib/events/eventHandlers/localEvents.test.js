import { localEventsEvent, localEventVariants } from "./localEvents";

test("conditions() is always true and probability() is fixed", () => {
  expect(localEventsEvent.conditions({})).toBe(true);
  expect(localEventsEvent.probability({})).toBe(0.1);
});

test("apply() picks a variant and returns its message/severity", () => {
  const context = { rng: () => 0 }; // first (highest-weight) variant: festival
  const applied = localEventsEvent.apply({}, context);

  expect(context.variant.id).toBe("festival");
  expect(applied.message).toMatch(/festival local/i);
  expect(applied.severity).toBe("low");
});

test("impact()/duration() reflect whichever variant was picked", () => {
  const context = { rng: () => 0.99 }; // last (lowest-weight) variant: match
  localEventsEvent.apply({}, context);

  expect(context.variant.id).toBe("match");
  expect(localEventsEvent.impact({}, context)).toEqual({ revenue: 250, expenses: 0, staff: 0, reputation: 0 });
  expect(localEventsEvent.duration({}, context)).toBe(1);
});

test("all three documented variants (festival, conférence, match) are reachable", () => {
  expect(localEventVariants.map((variant) => variant.id).sort()).toEqual(["conference", "festival", "match"]);
});
