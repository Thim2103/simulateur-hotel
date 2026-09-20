import { calculateReputation } from "./reputation";

test("starts at the target (sustainability + staff morale blend) with no prior reputation", () => {
  const result = calculateReputation({
    hotelState: { esg: { sustainabilityScore: 80 } },
    restaurantState: { staff: [{ satisfaction: 60 }] },
  });
  // target = 80*0.4 + 60*0.6 = 68
  expect(result).toBe(68);
});

test("drifts gradually toward the target instead of jumping there immediately", () => {
  const result = calculateReputation({
    hotelState: { esg: { sustainabilityScore: 100 } },
    restaurantState: { staff: [{ satisfaction: 100 }] },
    previousReputation: 20,
  });
  // target = 100; drift is partial, so it should move up but not reach 100 in one day.
  expect(result).toBeGreaterThan(20);
  expect(result).toBeLessThan(100);
});

test("adds today's event reputation impact on top of the drift", () => {
  const withoutEvent = calculateReputation({ hotelState: {}, restaurantState: {}, previousReputation: 50 });
  const withPositiveEvent = calculateReputation({
    hotelState: {},
    restaurantState: {},
    previousReputation: 50,
    events: [{ impact: { reputation: 10 } }],
  });
  expect(withPositiveEvent).toBe(withoutEvent + 10);
});

test("clamps the result between 0 and 100", () => {
  expect(calculateReputation({ previousReputation: 95, events: [{ impact: { reputation: 50 } }] })).toBeLessThanOrEqual(100);
  expect(calculateReputation({ previousReputation: 5, events: [{ impact: { reputation: -50 } }] })).toBeGreaterThanOrEqual(0);
});

test("defaults to a neutral staff morale (70) when there is no staff on record", () => {
  expect(() => calculateReputation({ restaurantState: { staff: [] } })).not.toThrow();
});

test("never throws with no arguments at all", () => {
  expect(() => calculateReputation()).not.toThrow();
});

describe("reputation / unrepaired equipment incidents", () => {
  const base = { restaurantState: {}, previousReputation: 50 };
  const incident = (overrides) => ({ id: "i1", zone: "laundry", severity: "critical", status: "active", daysOpen: 2, ...overrides });

  test("leaves reputation untouched when there are no incidents", () => {
    const without = calculateReputation({ ...base, hotelState: {} });
    const withEmpty = calculateReputation({ ...base, hotelState: { activeIncidents: [] } });
    expect(withEmpty).toBe(without);
  });

  test("an incident open past its grace period lowers reputation", () => {
    const clean = calculateReputation({ ...base, hotelState: {} });
    const hit = calculateReputation({ ...base, hotelState: { activeIncidents: [incident()] } });
    expect(hit).toBeLessThan(clean);
  });

  test("a fresh incident (inside the grace period) costs nothing yet", () => {
    const clean = calculateReputation({ ...base, hotelState: {} });
    const fresh = calculateReputation({ ...base, hotelState: { activeIncidents: [incident({ daysOpen: 0 })] } });
    expect(fresh).toBe(clean);
  });

  test("a repair in progress hurts less than an untouched incident, and a resolved one not at all", () => {
    const rep = (overrides) => calculateReputation({ ...base, hotelState: { activeIncidents: [incident(overrides)] } });
    const clean = calculateReputation({ ...base, hotelState: {} });
    expect(rep({ status: "repairing" })).toBeGreaterThan(rep({ status: "active" }));
    expect(rep({ status: "resolved" })).toBe(clean);
  });

  test("never drops below 0", () => {
    const many = Array.from({ length: 30 }, (_, i) => incident({ id: `i${i}` }));
    expect(calculateReputation({ ...base, previousReputation: 5, hotelState: { activeIncidents: many } })).toBe(0);
  });
});
