import { mergeWithEngineEvents, resolveEventsForCycle } from "./scenarioEvents";

test("a scheduled event fires only on its exact cycleIndex", () => {
  const events = [{ kind: "scheduled", id: "vip", cycleIndex: 3 }];
  expect(resolveEventsForCycle({ cycleIndex: 2, state: {}, events })).toEqual([]);
  expect(resolveEventsForCycle({ cycleIndex: 3, state: {}, events })).toEqual(events);
  expect(resolveEventsForCycle({ cycleIndex: 4, state: {}, events })).toEqual([]);
});

test("a conditional event fires once its condition becomes true", () => {
  const events = [{ kind: "conditional", id: "crisis", condition: (state) => state.cash < 0 }];
  expect(resolveEventsForCycle({ cycleIndex: 0, state: { cash: 100 }, events })).toEqual([]);
  expect(resolveEventsForCycle({ cycleIndex: 1, state: { cash: -10 }, events })).toEqual(events);
});

test("onceOnly prevents a conditional event from firing again once already triggered", () => {
  const events = [{ kind: "conditional", id: "crisis", onceOnly: true, condition: () => true }];
  const triggeredIds = new Set(["crisis"]);
  expect(resolveEventsForCycle({ cycleIndex: 0, state: {}, events, triggeredIds })).toEqual([]);
});

test("a throwing condition is treated as false rather than crashing the cycle", () => {
  const events = [{ kind: "conditional", id: "broken", condition: () => { throw new Error("boom"); } }];
  expect(() => resolveEventsForCycle({ cycleIndex: 0, state: {}, events })).not.toThrow();
});

test("mergeWithEngineEvents de-duplicates by id", () => {
  const merged = mergeWithEngineEvents([{ id: "restaurant_rush" }], [{ id: "restaurant_rush" }, { id: "weather" }]);
  expect(merged.map((event) => event.id)).toEqual(["restaurant_rush", "weather"]);
});
