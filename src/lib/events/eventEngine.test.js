// Tests the engine's mechanics (conditions/probability gating, multi-day
// continuation, non-stacking, impact aggregation) against a small fake
// catalog, independent of the real event definitions (each of which has its
// own eventHandlers/*.test.js).
import { generateEvents } from "./eventEngine";

const fakeAlwaysFires = {
  id: "always_fires",
  name: "Always fires",
  category: "test",
  conditions: () => true,
  // Not exactly 1: the "drop off" test needs a roll that fails once the
  // event is no longer active, to tell "still ongoing" apart from
  // "re-triggered the instant it expired".
  probability: () => 0.9,
  apply: () => ({ message: "It happened.", severity: "low" }),
  impact: { revenue: 100, expenses: 10, staff: 1, reputation: 2 },
  duration: 2,
};

const fakeNeverFires = {
  id: "never_fires",
  name: "Never fires",
  category: "test",
  conditions: () => true,
  probability: () => 0,
  apply: () => ({ message: "Should not happen." }),
  impact: { revenue: 9999 },
  duration: 1,
};

const fakeConditionGated = {
  id: "condition_gated",
  name: "Condition gated",
  category: "test",
  conditions: ({ hotelState }) => Boolean(hotelState?.allowGatedEvent),
  probability: () => 1,
  apply: () => ({ message: "Gate was open." }),
  impact: { reputation: 5 },
  duration: 1,
};

jest.mock("./eventDefinitions", () => ({
  EVENT_DEFINITIONS: [fakeAlwaysFires, fakeNeverFires, fakeConditionGated],
}));

describe("generateEvents", () => {
  test("only fires events whose probability roll succeeds", () => {
    const result = generateEvents({ rng: () => 0.5 });
    const ids = result.triggeredEvents.map((event) => event.id);
    expect(ids).toContain("always_fires");
    expect(ids).not.toContain("never_fires");
  });

  test("does not fire an event whose conditions() is false", () => {
    const withoutGate = generateEvents({ hotelState: {}, rng: () => 0 });
    expect(withoutGate.triggeredEvents.some((event) => event.id === "condition_gated")).toBe(false);

    const withGate = generateEvents({ hotelState: { allowGatedEvent: true }, rng: () => 0 });
    expect(withGate.triggeredEvents.some((event) => event.id === "condition_gated")).toBe(true);
  });

  test("a newly triggered event carries its impact, message, severity and duration", () => {
    const result = generateEvents({ rng: () => 0 });
    const event = result.events.find((entry) => entry.id === "always_fires");
    expect(event).toMatchObject({
      name: "Always fires",
      category: "test",
      message: "It happened.",
      severity: "low",
      impact: { revenue: 100, expenses: 10, staff: 1, reputation: 2 },
      totalDays: 2,
      remainingDays: 2,
    });
  });

  test("combines the impact of every event that fired or is still ongoing", () => {
    const result = generateEvents({ rng: () => 0 });
    expect(result.impacts).toEqual({ revenue: 100, expenses: 10, staff: 1, reputation: 2 });
  });

  test("a multi-day event continues (with a decremented remainingDays) on the next call", () => {
    const day1 = generateEvents({ rng: () => 0 });
    const started = day1.events.find((event) => event.id === "always_fires");
    expect(started.remainingDays).toBe(2);

    // Feed day 1's activeEvents into day 2, with rng that fires nothing new.
    const day2 = generateEvents({ activeEvents: day1.activeEvents, rng: () => 0.999 });
    const continuing = day2.events.find((event) => event.id === "always_fires");
    expect(continuing.remainingDays).toBe(1);
    expect(day2.triggeredEvents).toHaveLength(0); // it's continuing, not "new today"
  });

  test("a multi-day event drops off once its duration runs out", () => {
    const day1 = generateEvents({ rng: () => 0 }); // remainingDays: 2
    const day2 = generateEvents({ activeEvents: day1.activeEvents, rng: () => 0.999 }); // remainingDays: 1
    const day3 = generateEvents({ activeEvents: day2.activeEvents, rng: () => 0.999 }); // expires

    expect(day3.events.some((event) => event.id === "always_fires")).toBe(false);
    expect(day3.activeEvents).toEqual([]);
  });

  test("does not roll a second instance of an event already active", () => {
    const day1 = generateEvents({ rng: () => 0 });
    // rng: () => 0 would normally re-trigger every definition, but
    // always_fires is already active from day 1.
    const day2 = generateEvents({ activeEvents: day1.activeEvents, rng: () => 0 });
    const activeCount = day2.events.filter((event) => event.id === "always_fires").length;
    expect(activeCount).toBe(1);
  });

  test("never throws with no state/activeEvents at all", () => {
    expect(() => generateEvents()).not.toThrow();
  });
});
