import { findEventDefinition, findNextEligibleEvent, isEventEligible } from "./careerEvents";

const CATALOG = [
  { id: "e1", minDay: 3, minLevel: 1, choices: [] },
  { id: "e2", minDay: 10, minLevel: 2, choices: [] },
];

test("isEventEligible requires the minimum day and level", () => {
  expect(isEventEligible(CATALOG[0], { day: 2, level: 1, triggeredEventIds: [] })).toBe(false);
  expect(isEventEligible(CATALOG[0], { day: 3, level: 1, triggeredEventIds: [] })).toBe(true);
  expect(isEventEligible(CATALOG[1], { day: 10, level: 1, triggeredEventIds: [] })).toBe(false);
});

test("isEventEligible excludes an event already triggered", () => {
  expect(isEventEligible(CATALOG[0], { day: 5, level: 1, triggeredEventIds: ["e1"] })).toBe(false);
});

test("findNextEligibleEvent returns the first eligible, not-yet-seen event", () => {
  const event = findNextEligibleEvent({ day: 12, level: 3, triggeredEventIds: [] }, CATALOG);
  expect(event.id).toBe("e1");
});

test("findNextEligibleEvent skips already-triggered events", () => {
  const event = findNextEligibleEvent({ day: 12, level: 3, triggeredEventIds: ["e1"] }, CATALOG);
  expect(event.id).toBe("e2");
});

test("findNextEligibleEvent returns null when nothing is eligible", () => {
  expect(findNextEligibleEvent({ day: 1, level: 1, triggeredEventIds: [] }, CATALOG)).toBeNull();
});

test("findEventDefinition looks up by id from the real catalog", () => {
  expect(findEventDefinition("first-week-review")).toEqual(expect.objectContaining({ id: "first-week-review" }));
  expect(findEventDefinition("missing")).toBeNull();
});
