import { EVENT_DEFINITIONS, eventDefinitionsById } from "./eventDefinitions";

test("the catalogue has exactly the nine requested event categories", () => {
  expect(EVENT_DEFINITIONS.map((definition) => definition.id).sort()).toEqual(
    [
      "customer_review",
      "health_inspection",
      "local_event",
      "power_outage",
      "restaurant_rush",
      "staff_strike",
      "technical_incident",
      "vip_guest",
      "weather",
    ].sort()
  );
});

test("every definition has the full required shape", () => {
  EVENT_DEFINITIONS.forEach((definition) => {
    expect(typeof definition.id).toBe("string");
    expect(typeof definition.name).toBe("string");
    expect(typeof definition.probability).toBe("function");
    expect(typeof definition.conditions).toBe("function");
    expect(typeof definition.apply).toBe("function");
    expect(definition.impact).toBeDefined();
    expect(definition.duration).toBeDefined();
  });
});

test("ids are unique", () => {
  const ids = EVENT_DEFINITIONS.map((definition) => definition.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("eventDefinitionsById indexes every definition by its id", () => {
  EVENT_DEFINITIONS.forEach((definition) => {
    expect(eventDefinitionsById[definition.id]).toBe(definition);
  });
});
