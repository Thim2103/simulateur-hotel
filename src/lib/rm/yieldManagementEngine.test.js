import {
  DEFAULT_YIELD,
  MIN_YIELD_MULTIPLIER,
  MAX_YIELD_MULTIPLIER,
  getYieldConfig,
  isYieldEnabled,
  setYieldEnabled,
  setYieldRule,
  projectedOccupancy,
  createYieldPricer,
  summarizeYield,
} from "./yieldManagementEngine";
import { eventsOn, seasonIdOn } from "../hotelEvents/hotelEventsEngine";

const D = (text) => new Date(`${text}T12:00:00Z`);
const DAY = 86400000;
function findDate(test, from = "2026-01-01") {
  for (let i = 0; i < 1500; i += 1) {
    const date = new Date(D(from).getTime() + i * DAY);
    if (test(date)) return date;
  }
  throw new Error("no date found");
}
// A day with nothing going on for the following week either, so that only the rule under test applies.
const quiet = findDate((d) => Array.from({ length: 8 }, (_, i) => new Date(d.getTime() + i * DAY)).every((day) => eventsOn(day).length === 0 && seasonIdOn(day) === "shoulder"));
const iso = (date) => date.toISOString().slice(0, 10);
const plus = (date, days) => new Date(date.getTime() + days * DAY);

const rooms = (count) => Array.from({ length: count }, (_, i) => ({ id: i + 1, number: String(100 + i), type: "standard", status: "libre", price: 100 }));
// `count` reservations occupying the night of `night` (one room each).
const booked = (count, night) => Array.from({ length: count }, (_, i) => ({ id: i + 1, room_id: i + 1, status: "confirmée", arrival: iso(night), departure: iso(plus(night, 1)) }));
const enabled = (extra = {}) => ({ yieldManagement: { enabled: true, ...extra } });

describe("yieldManagementEngine / configuration", () => {
  it("is off by default, with the rules the player asked for", () => {
    expect(isYieldEnabled({})).toBe(false);
    const config = getYieldConfig({});
    expect(config.enabled).toBe(false);
    expect(config.occupancy).toEqual({ enabled: true, threshold: 80, adjustment: 0.15 });
    expect(config.lastMinute).toEqual({ enabled: true, threshold: 40, daysAhead: 2, adjustment: -0.2 });
    expect(config.events).toEqual({ enabled: true, adjustment: 0.1 });
    expect(DEFAULT_YIELD.enabled).toBe(false);
  });

  it("switches on and off", () => {
    const on = setYieldEnabled({ hotelState: {} }, true);
    expect(isYieldEnabled(on.hotelState)).toBe(true);
    expect(isYieldEnabled(setYieldEnabled(on, false).hotelState)).toBe(false);
  });

  it("switching to the state it is already in changes nothing", () => {
    const on = setYieldEnabled({ hotelState: {} }, true);
    expect(setYieldEnabled(on, true)).toBe(on);
  });

  it("sets one rule without touching the others", () => {
    const next = setYieldRule({ hotelState: {} }, "occupancy", { threshold: 70, adjustment: 0.2 });
    const config = getYieldConfig(next.hotelState);
    expect(config.occupancy).toMatchObject({ threshold: 70, adjustment: 0.2 });
    expect(config.lastMinute).toEqual(getYieldConfig({}).lastMinute);
  });

  it("can disable a single rule", () => {
    expect(getYieldConfig(setYieldRule({ hotelState: {} }, "events", { enabled: false }).hotelState).events.enabled).toBe(false);
  });

  it("keeps values in range", () => {
    const config = getYieldConfig(setYieldRule(setYieldRule({ hotelState: {} }, "occupancy", { threshold: 500, adjustment: 9 }), "lastMinute", { adjustment: 3, daysAhead: 99, threshold: -5 }).hotelState);
    expect(config.occupancy).toMatchObject({ threshold: 100, adjustment: 0.5 });
    expect(config.lastMinute).toMatchObject({ adjustment: 0, daysAhead: 7, threshold: 0 });
  });

  it("ignores an unknown rule", () => {
    const bundle = { hotelState: {} };
    expect(setYieldRule(bundle, "moon-phase", { adjustment: 0.3 })).toBe(bundle);
  });

  it("does not mutate its input", () => {
    const bundle = { hotelState: { yieldManagement: { enabled: true } } };
    const snapshot = JSON.stringify(bundle);
    setYieldRule(bundle, "occupancy", { threshold: 60 });
    expect(JSON.stringify(bundle)).toBe(snapshot);
  });

  it("repairs a malformed stored configuration", () => {
    const config = getYieldConfig({ yieldManagement: { enabled: "yes", occupancy: { threshold: "abc", adjustment: null } } });
    expect(config.enabled).toBe(false);
    expect(config.occupancy).toMatchObject({ threshold: 80, adjustment: 0.15 }); // back to the defaults
  });
});

describe("yieldManagementEngine / projected occupancy", () => {
  it("is the share of bookable rooms taken on a night", () => {
    expect(projectedOccupancy(rooms(10), booked(4, quiet), quiet)).toBe(40);
    expect(projectedOccupancy(rooms(10), [], quiet)).toBe(0);
  });

  it("counts the night of arrival but not the day of departure", () => {
    expect(projectedOccupancy(rooms(10), booked(3, quiet), plus(quiet, 1))).toBe(0);
    expect(projectedOccupancy(rooms(10), booked(3, quiet), quiet)).toBe(30);
  });

  it("does not count cancelled stays, nor rooms out of service", () => {
    const reservations = [...booked(2, quiet), { id: 9, room_id: 9, status: "annulée", arrival: iso(quiet), departure: iso(plus(quiet, 2)) }];
    expect(projectedOccupancy(rooms(10), reservations, quiet)).toBe(20);
    const withOutage = [...rooms(9), { id: 10, status: "hors_service" }];
    expect(projectedOccupancy(withOutage, booked(3, quiet), quiet)).toBeCloseTo(33.3, 0);
  });

  it("is 0 for a hotel with no rooms, and never above 100", () => {
    expect(projectedOccupancy([], booked(3, quiet), quiet)).toBe(0);
    expect(projectedOccupancy(rooms(2), booked(5, quiet), quiet)).toBe(100);
  });
});

describe("yieldManagementEngine / the pricer", () => {
  const priceFor = (state, { occupied = 0, lead = 5, arrival = plus(quiet, 5) } = {}) => {
    const pricer = createYieldPricer({ hotelState: state, rooms: rooms(10), referenceDate: quiet });
    return pricer(rooms(1)[0], lead === undefined ? arrival : plus(quiet, lead), booked(occupied, plus(quiet, lead)));
  };

  it("does nothing when Yield Management is off", () => {
    expect(createYieldPricer({ hotelState: {}, rooms: rooms(10), referenceDate: quiet })).toBeNull();
  });

  it("raises the rooms left by 15 % when the hotel is over 80 % full", () => {
    const result = priceFor(enabled(), { occupied: 9, lead: 5 });
    expect(result.multiplier).toBeCloseTo(1.15);
    expect(result.rules).toEqual(["occupancy"]);
  });

  it("only above the threshold, not at it", () => {
    expect(priceFor(enabled(), { occupied: 8, lead: 5 }).multiplier).toBe(1);
  });

  it("discounts by 20 % a nearly empty hotel for an arrival within two days", () => {
    const result = priceFor(enabled(), { occupied: 2, lead: 2 });
    expect(result.multiplier).toBeCloseTo(0.8);
    expect(result.rules).toEqual(["lastMinute"]);
  });

  it("but not for an arrival further ahead, nor when it is not that empty", () => {
    expect(priceFor(enabled(), { occupied: 2, lead: 3 }).multiplier).toBe(1);
    expect(priceFor(enabled(), { occupied: 5, lead: 1 }).multiplier).toBe(1);
  });

  it("charges a premium in high season", () => {
    const summer = findDate((d) => seasonIdOn(d) === "summer" && eventsOn(d).length === 0);
    const pricer = createYieldPricer({ hotelState: enabled(), rooms: rooms(10), referenceDate: summer });
    const result = pricer(rooms(1)[0], plus(summer, 5), []);
    expect(result.rules).toContain("events");
    expect(result.multiplier).toBeGreaterThanOrEqual(1.1 - 0.0001);
  });

  it("charges a premium during a festival or a trade fair", () => {
    const festival = findDate((d) => eventsOn(d).some((event) => event.kind === "demand") && seasonIdOn(d) === "shoulder");
    const pricer = createYieldPricer({ hotelState: enabled(), rooms: rooms(10), referenceDate: festival });
    expect(pricer(rooms(1)[0], festival, []).rules).toContain("events");
  });

  it("adds no event premium on a quiet shoulder-season day", () => {
    expect(priceFor(enabled(), { occupied: 5, lead: 5 }).rules).toEqual([]);
  });

  it("a rule the player switched off does not apply", () => {
    expect(priceFor(enabled({ occupancy: { enabled: false } }), { occupied: 9, lead: 5 }).multiplier).toBe(1);
  });

  it("uses the player's own thresholds and adjustments", () => {
    const state = enabled({ occupancy: { threshold: 50, adjustment: 0.3 } });
    expect(priceFor(state, { occupied: 6, lead: 5 }).multiplier).toBeCloseTo(1.3);
  });

  it("rules add up, within the floor and the ceiling", () => {
    const summer = findDate((d) => seasonIdOn(d) === "summer" && eventsOn(d).length === 0);
    const state = enabled({ occupancy: { adjustment: 0.5, threshold: 10 }, events: { adjustment: 0.5 } });
    const pricer = createYieldPricer({ hotelState: state, rooms: rooms(10), referenceDate: summer });
    expect(pricer(rooms(1)[0], plus(summer, 3), booked(9, plus(summer, 3))).multiplier).toBe(MAX_YIELD_MULTIPLIER);
    const cheap = enabled({ lastMinute: { adjustment: -0.5 } });
    const low = createYieldPricer({ hotelState: cheap, rooms: rooms(10), referenceDate: quiet });
    expect(low(rooms(1)[0], quiet, []).multiplier).toBe(MIN_YIELD_MULTIPLIER + 0);
  });

  it("is deterministic", () => {
    expect(priceFor(enabled(), { occupied: 9, lead: 5 })).toEqual(priceFor(enabled(), { occupied: 9, lead: 5 }));
  });
});

describe("yieldManagementEngine / summary", () => {
  it("sums what the adjustments amounted to, and by rule", () => {
    const summary = summarizeYield([
      { reservationId: 1, rules: ["occupancy"], delta: 45 },
      { reservationId: 2, rules: ["occupancy", "events"], delta: 60 },
      { reservationId: 3, rules: ["lastMinute"], delta: -40 },
    ]);
    expect(summary).toEqual({ enabled: true, adjusted: 3, raised: 2, lowered: 1, revenueDelta: 65, byRule: { occupancy: 2, events: 1, lastMinute: 1 } });
  });

  it("an empty day", () => {
    expect(summarizeYield([], true)).toEqual({ enabled: true, adjusted: 0, raised: 0, lowered: 0, revenueDelta: 0, byRule: {} });
    expect(summarizeYield(undefined, false).enabled).toBe(false);
  });
});
