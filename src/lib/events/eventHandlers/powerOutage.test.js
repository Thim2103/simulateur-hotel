import { powerOutageEvent } from "./powerOutage";

test("conditions() always allows it, probability() is low", () => {
  expect(powerOutageEvent.conditions({})).toBe(true);
  expect(powerOutageEvent.probability({})).toBe(0.04);
});

test("apply() returns a high-severity message", () => {
  const applied = powerOutageEvent.apply({}, {});
  expect(applied.message).toMatch(/coupure de courant/i);
  expect(applied.severity).toBe("high");
});

test("impact hurts revenue and reputation while costing repair money, for a single day", () => {
  expect(powerOutageEvent.impact).toEqual({ revenue: -200, expenses: 350, staff: -1, reputation: -1 });
  expect(powerOutageEvent.duration).toBe(1);
});
