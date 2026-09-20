import {
  SEASON_TIERS,
  EVENT_TYPES,
  CLIMATE_WEAR_CHANCE,
  AUDIT_LABEL_SCORE,
  AUDIT_WARNING_SCORE,
  AUDIT_LABEL_REPUTATION,
  AUDIT_LABEL_DAYS,
  AUDIT_WARNING_REPUTATION,
  AUDIT_WARNING_DAYS,
  MAX_PRICE_TOLERANCE,
  dayIndexOf,
  toIsoDate,
  seasonIdOn,
  seasonOn,
  seasonDemand,
  lowSeasonRelief,
  eventsOn,
  upcomingEvents,
  eventsEndedBefore,
  calendarEffects,
  describeEventEffects,
  describeCalendar,
  evaluateAudit,
  advanceHotelEvents,
  todaySnapshot,
  housekeepingPressureOf,
  auditOn,
  auditReputationBonus,
} from "./hotelEventsEngine";

const D = (text) => new Date(`${text}T12:00:00Z`);
const DAY = 86400000;

// The first date from `from` on for which `test(date)` holds -- the
// calendar is deterministic, so this is stable, and it keeps the tests from
// hard-coding where the hash happened to put each event.
function findDate(test, from = "2026-01-01", limit = 1500) {
  for (let i = 0; i < limit; i += 1) {
    const date = new Date(D(from).getTime() + i * DAY);
    if (test(date)) return date;
  }
  throw new Error("no date found");
}
const firstDayOf = (id, from) => findDate((date) => eventsOn(date).some((event) => event.id === id && event.dayNumber === 1), from);
const level = (maintenanceLevel, condition = 80, extra = {}) => ({ maintenance: { level: maintenanceLevel, condition }, ...extra });

describe("hotelEventsEngine / seasons", () => {
  it("summer (21 Jun - 31 Aug) and the year-end holidays (20 Dec - 3 Jan) are high season", () => {
    ["2026-06-21", "2026-07-15", "2026-08-31"].forEach((date) => expect(seasonIdOn(D(date))).toBe("summer"));
    ["2026-12-20", "2026-12-31", "2027-01-03"].forEach((date) => expect(seasonIdOn(D(date))).toBe("holidays"));
    expect(seasonOn(D("2026-07-15")).tier).toBe("high");
    expect(seasonOn(D("2026-12-25")).tier).toBe("high");
  });

  it("November and 4 Jan - 14 Feb are low season", () => {
    ["2026-11-01", "2026-11-30", "2027-01-04", "2027-02-14"].forEach((date) => expect(seasonIdOn(D(date))).toBe("low"));
    expect(seasonOn(D("2026-11-11")).tier).toBe("low");
  });

  it("the rest of the year is shoulder season", () => {
    ["2026-03-15", "2026-05-01", "2026-06-20", "2026-09-15", "2026-10-31", "2026-12-19", "2027-02-15"].forEach((date) => expect(seasonIdOn(D(date))).toBe("shoulder"));
  });

  it("every day of the year has a season", () => {
    for (let i = 0; i < 366; i += 1) expect(["summer", "holidays", "low", "shoulder"]).toContain(seasonIdOn(new Date(D("2026-01-01").getTime() + i * DAY)));
  });

  it("high season: demand +40 %, prices +20 % tolerated, housekeeping and wear under pressure", () => {
    expect(SEASON_TIERS.high).toMatchObject({ demand: 1.4, priceTolerance: 0.2 });
    expect(SEASON_TIERS.high.housekeepingPressure).toBeGreaterThan(1);
    expect(SEASON_TIERS.high.wearPressure).toBeGreaterThan(0);
  });

  it("low season: demand -30 %, no extra tolerance, no extra pressure", () => {
    expect(SEASON_TIERS.low).toMatchObject({ demand: 0.7, priceTolerance: 0, housekeepingPressure: 1, wearPressure: 0 });
  });

  it("shoulder season is neutral", () => {
    expect(SEASON_TIERS.shoulder).toMatchObject({ demand: 1, priceTolerance: 0, housekeepingPressure: 1, wearPressure: 0 });
  });

  it("seasonDemand follows the tier", () => {
    expect(seasonDemand(D("2026-07-15"))).toBe(1.4);
    expect(seasonDemand(D("2026-04-15"))).toBe(1);
    expect(seasonDemand(D("2026-11-11"))).toBe(0.7);
  });

  it("marketing wins back part of the low season, only above 3 000 EUR/month, up to 10 points", () => {
    const withBudget = (budget) => ({ marketing: { budget } });
    expect(lowSeasonRelief(withBudget(3000))).toBe(0);
    expect(lowSeasonRelief(withBudget(500))).toBe(0);
    expect(lowSeasonRelief(withBudget(6500))).toBeCloseTo(0.035);
    expect(lowSeasonRelief(withBudget(100000))).toBe(0.1);
    expect(seasonDemand(D("2026-11-11"), withBudget(6500))).toBeCloseTo(0.735);
    expect(seasonDemand(D("2026-11-11"), withBudget(100000))).toBeCloseTo(0.8);
  });

  it("marketing changes nothing outside the low season", () => {
    expect(seasonDemand(D("2026-07-15"), { marketing: { budget: 100000 } })).toBe(1.4);
    expect(seasonDemand(D("2026-04-15"), { marketing: { budget: 100000 } })).toBe(1);
  });

  it("copes with a missing hotel state", () => {
    expect(lowSeasonRelief(undefined)).toBe(0);
    expect(seasonDemand(D("2026-11-11"), undefined)).toBe(0.7);
  });
});

describe("hotelEventsEngine / dates", () => {
  it("counts whole UTC days regardless of the time of day", () => {
    expect(dayIndexOf(new Date("2026-03-01T00:00:00Z"))).toBe(dayIndexOf(new Date("2026-03-01T23:59:59Z")));
    expect(dayIndexOf(D("2026-03-02")) - dayIndexOf(D("2026-03-01"))).toBe(1);
  });

  it("formats an ISO date", () => {
    expect(toIsoDate(D("2026-03-01"))).toBe("2026-03-01");
  });
});

describe("hotelEventsEngine / scheduled events", () => {
  it("is deterministic: the same date gives the same events", () => {
    for (let i = 0; i < 120; i += 1) {
      const date = new Date(D("2026-01-01").getTime() + i * DAY);
      expect(eventsOn(date)).toEqual(eventsOn(date));
      expect(upcomingEvents(date)).toEqual(upcomingEvents(date));
    }
  });

  it("every type does happen over a few years", () => {
    const seen = new Set();
    for (let i = 0; i < 1100; i += 1) eventsOn(new Date(D("2026-01-01").getTime() + i * DAY)).forEach((event) => seen.add(event.id));
    expect([...seen].sort()).toEqual(Object.keys(EVENT_TYPES).sort());
  });

  it("but not every day: most days are quiet", () => {
    let busy = 0;
    for (let i = 0; i < 365; i += 1) if (eventsOn(new Date(D("2026-01-01").getTime() + i * DAY)).length > 0) busy += 1;
    expect(busy).toBeGreaterThan(20);
    expect(busy).toBeLessThan(250);
  });

  it("festivals and trade fairs last 3 days, heat and cold waves 4, the audit 1", () => {
    expect(EVENT_TYPES.festival.durationDays).toBe(3);
    expect(EVENT_TYPES["trade-fair"].durationDays).toBe(3);
    expect(EVENT_TYPES.heatwave.durationDays).toBe(4);
    expect(EVENT_TYPES.coldwave.durationDays).toBe(4);
    expect(EVENT_TYPES["hygiene-audit"].durationDays).toBe(1);
  });

  it("an event runs for exactly its duration, day 1 to the last day", () => {
    const start = firstDayOf("festival");
    const days = [0, 1, 2].map((offset) => eventsOn(new Date(start.getTime() + offset * DAY)).find((event) => event.id === "festival"));
    expect(days.map((event) => event.dayNumber)).toEqual([1, 2, 3]);
    expect(days.map((event) => event.daysLeft)).toEqual([2, 1, 0]);
    expect(days.map((event) => event.endsToday)).toEqual([false, false, true]);
    expect(eventsOn(new Date(start.getTime() + 3 * DAY)).some((event) => event.id === "festival")).toBe(false);
    expect(eventsOn(new Date(start.getTime() - DAY)).some((event) => event.id === "festival")).toBe(false);
  });

  it("happens only in the months that make sense for it", () => {
    const monthsOf = (id) => {
      const months = new Set();
      for (let i = 0; i < 1100; i += 1) {
        const date = new Date(D("2026-01-01").getTime() + i * DAY);
        if (eventsOn(date).some((event) => event.id === id && event.dayNumber === 1)) months.add(date.getUTCMonth());
      }
      return [...months];
    };
    monthsOf("heatwave").forEach((month) => expect([5, 6, 7]).toContain(month));
    monthsOf("coldwave").forEach((month) => expect([11, 0, 1]).toContain(month));
    monthsOf("festival").forEach((month) => expect(EVENT_TYPES.festival.months).toContain(month));
    expect(monthsOf("heatwave").length).toBeGreaterThan(0);
  });

  it("describes each event with its name, icon, kind and effects", () => {
    const [event] = eventsOn(firstDayOf("festival")).filter((item) => item.id === "festival");
    expect(event).toMatchObject({ name: "Festival local", kind: "demand", totalDays: 3, dayNumber: 1 });
    expect(event.icon).toBeTruthy();
    expect(event.effects.join(" ")).toMatch(/demande \+30 %/i);
    expect(event.startDate < event.endDate).toBe(true);
  });
});

describe("hotelEventsEngine / notice and end", () => {
  it("announces an event a few days before it starts, with the days left to wait", () => {
    const start = firstDayOf("festival");
    const notice = EVENT_TYPES.festival.noticeDays;
    for (let ahead = 1; ahead <= notice; ahead += 1) {
      const announced = upcomingEvents(new Date(start.getTime() - ahead * DAY)).find((event) => event.id === "festival");
      expect(announced).toMatchObject({ startsInDays: ahead, totalDays: 3 });
    }
  });

  it("does not announce it earlier than its notice, nor once it has started", () => {
    const start = firstDayOf("festival");
    expect(upcomingEvents(new Date(start.getTime() - (EVENT_TYPES.festival.noticeDays + 1) * DAY)).some((event) => event.id === "festival")).toBe(false);
    expect(upcomingEvents(start).some((event) => event.id === "festival")).toBe(false);
  });

  it("the surprise audit is never announced", () => {
    const start = firstDayOf("hygiene-audit");
    for (let ahead = 1; ahead <= 10; ahead += 1) expect(upcomingEvents(new Date(start.getTime() - ahead * DAY)).some((event) => event.id === "hygiene-audit")).toBe(false);
    expect(EVENT_TYPES["hygiene-audit"].noticeDays).toBe(0);
  });

  it("an event is reported as ended the day after its last day", () => {
    const start = firstDayOf("festival");
    const after = new Date(start.getTime() + 3 * DAY);
    expect(eventsEndedBefore(after).some((event) => event.id === "festival")).toBe(true);
    expect(eventsEndedBefore(new Date(start.getTime() + 2 * DAY)).some((event) => event.id === "festival")).toBe(false);
  });

  it("the horizon limits how far ahead we look", () => {
    const start = firstDayOf("trade-fair");
    const notice = EVENT_TYPES["trade-fair"].noticeDays;
    const early = new Date(start.getTime() - notice * DAY);
    expect(upcomingEvents(early).some((event) => event.id === "trade-fair")).toBe(true);
    expect(upcomingEvents(early, 1).some((event) => event.id === "trade-fair")).toBe(false);
  });
});

describe("hotelEventsEngine / effects of a date", () => {
  const quiet = findDate((date) => eventsOn(date).length === 0 && seasonIdOn(date) === "shoulder");

  it("a quiet shoulder-season day changes nothing", () => {
    expect(calendarEffects(quiet)).toMatchObject({ eventsDemandFactor: 1, priceTolerance: 0, premiumFirst: false, housekeepingPressure: 1, wearPressure: 0, energyExtra: 0, climate: null });
  });

  it("a festival lifts demand by 30 % and favours the high-end rooms", () => {
    const effects = calendarEffects(firstDayOf("festival"));
    expect(effects.eventsDemandFactor).toBeGreaterThanOrEqual(1.3 * 0.94);
    expect(effects.premiumFirst).toBe(true);
    expect(effects.priceTolerance).toBeGreaterThan(0);
  });

  it("a trade fair lifts demand by 20 % and favours the high-end rooms", () => {
    const date = findDate((d) => eventsOn(d).some((event) => event.id === "trade-fair") && !eventsOn(d).some((event) => event.id !== "trade-fair"));
    expect(calendarEffects(date)).toMatchObject({ eventsDemandFactor: 1.2, premiumFirst: true });
  });

  it("a heat wave costs energy and wears the building, with a small dent in demand", () => {
    const date = findDate((d) => eventsOn(d).length === 1 && eventsOn(d)[0].id === "heatwave");
    const effects = calendarEffects(date);
    expect(effects).toMatchObject({ climate: "heat", energyExtra: 90, eventsDemandFactor: 0.95 });
    expect(effects.wearPressure).toBeGreaterThanOrEqual(1);
  });

  it("a cold wave does the same", () => {
    const date = findDate((d) => eventsOn(d).length === 1 && eventsOn(d)[0].id === "coldwave");
    expect(calendarEffects(date)).toMatchObject({ climate: "cold", energyExtra: 90 });
  });

  it("domotics halve the energy bill of a climate event", () => {
    const date = findDate((d) => eventsOn(d).length === 1 && eventsOn(d)[0].id === "heatwave");
    const domotics = { zoneUpgrades: { installed: { "rooms-domotics": { day: 1 } }, works: {}, completedLog: [] } };
    expect(calendarEffects(date, domotics).energyExtra).toBe(45);
  });

  it("high season puts housekeeping and wear under pressure", () => {
    const date = findDate((d) => seasonIdOn(d) === "summer" && eventsOn(d).length === 0);
    expect(calendarEffects(date)).toMatchObject({ housekeepingPressure: SEASON_TIERS.high.housekeepingPressure, wearPressure: SEASON_TIERS.high.wearPressure, priceTolerance: SEASON_TIERS.high.priceTolerance });
  });

  it("the price tolerance is capped", () => {
    for (let i = 0; i < 1100; i += 1) expect(calendarEffects(new Date(D("2026-01-01").getTime() + i * DAY)).priceTolerance).toBeLessThanOrEqual(MAX_PRICE_TOLERANCE);
  });

  it("describes effects in words", () => {
    expect(describeEventEffects(EVENT_TYPES.festival).join(" ")).toMatch(/demande \+30 %.*haut de gamme/i);
    expect(describeEventEffects(EVENT_TYPES.heatwave).join(" ")).toMatch(/énergie : \+90 €\/jour.*usure/i);
    expect(describeEventEffects(EVENT_TYPES["hygiene-audit"]).join(" ")).toMatch(/label/i);
  });
});

describe("hotelEventsEngine / the audit", () => {
  it("a well-kept hotel earns the quality label", () => {
    const result = evaluateAudit(level("premium", 90));
    expect(result).toMatchObject({ outcome: "label", reputation: AUDIT_LABEL_REPUTATION, duration: AUDIT_LABEL_DAYS });
    expect(result.score).toBeGreaterThanOrEqual(AUDIT_LABEL_SCORE);
    expect(result.message).toMatch(/label qualité/i);
  });

  it("an ordinary hotel is simply compliant", () => {
    expect(evaluateAudit({})).toMatchObject({ outcome: "ok", reputation: 0, duration: 0, score: 80 });
  });

  it("a run-down hotel gets a warning", () => {
    const result = evaluateAudit(level("economy", 50));
    expect(result).toMatchObject({ outcome: "warning", reputation: AUDIT_WARNING_REPUTATION, duration: AUDIT_WARNING_DAYS });
    expect(result.score).toBeLessThan(AUDIT_WARNING_SCORE);
  });

  it("the upkeep level moves the score: Premium up, Économique down", () => {
    expect(evaluateAudit(level("premium", 70)).score).toBeGreaterThan(evaluateAudit(level("standard", 70)).score);
    expect(evaluateAudit(level("economy", 70)).score).toBeLessThan(evaluateAudit(level("standard", 70)).score);
  });

  it("unrepaired breakdowns count against the hotel, up to a point", () => {
    const incidents = (count) => ({ activeIncidents: Array.from({ length: count }, (_, i) => ({ id: `i${i}`, status: "active", severity: "minor" })) });
    const clean = evaluateAudit(level("standard", 80)).score;
    expect(evaluateAudit(level("standard", 80, incidents(1))).score).toBe(clean - 5);
    expect(evaluateAudit(level("standard", 80, incidents(10))).score).toBe(clean - 15);
  });

  it("a resolved breakdown does not", () => {
    const state = level("standard", 80, { activeIncidents: [{ id: "i", status: "resolved", severity: "critical" }] });
    expect(evaluateAudit(state).score).toBe(80);
  });

  it("the score stays within 0..100", () => {
    expect(evaluateAudit(level("premium", 100)).score).toBeLessThanOrEqual(100);
    expect(evaluateAudit(level("economy", 0)).score).toBe(0);
  });
});

describe("hotelEventsEngine / the played day", () => {
  const quiet = findDate((date) => eventsOn(date).length === 0 && seasonIdOn(date) === "shoulder");
  const heat = findDate((d) => eventsOn(d).length === 1 && eventsOn(d)[0].id === "heatwave");
  const auditDay = firstDayOf("hygiene-audit");

  it("snapshots the day: date, season, events and pressures", () => {
    const next = advanceHotelEvents({}, heat, 12);
    expect(next.hotelEvents.today).toMatchObject({ date: toIsoDate(heat), day: 12, events: ["heatwave"] });
    expect(next.hotelEvents.today.wearPressure).toBeGreaterThanOrEqual(1);
    expect(todaySnapshot(next)).toBe(next.hotelEvents.today);
  });

  it("a quiet day has no pressure at all", () => {
    expect(advanceHotelEvents({}, quiet, 3).hotelEvents.today).toMatchObject({ events: [], housekeepingPressure: 1, wearPressure: 0, wearChanceBonus: 0 });
  });

  it("there is no snapshot before a day has been played", () => {
    expect(todaySnapshot({})).toBeNull();
    expect(housekeepingPressureOf({})).toBe(1);
  });

  it("housekeeping pressure comes from the snapshot", () => {
    const summer = findDate((d) => seasonIdOn(d) === "summer" && eventsOn(d).length === 0);
    expect(housekeepingPressureOf(advanceHotelEvents({}, summer, 1))).toBeCloseTo(SEASON_TIERS.high.housekeepingPressure);
  });

  it("a climate event raises the wear-breakdown chance most for the Économique level, not at all for Premium", () => {
    const bonus = (name) => advanceHotelEvents(level(name), heat, 1).hotelEvents.today.wearChanceBonus;
    expect(bonus("economy")).toBe(CLIMATE_WEAR_CHANCE.economy);
    expect(bonus("standard")).toBe(CLIMATE_WEAR_CHANCE.standard);
    expect(bonus("premium")).toBe(0);
    expect(bonus("economy")).toBeGreaterThan(bonus("standard"));
  });

  it("domotics halve that risk", () => {
    const domotics = { zoneUpgrades: { installed: { "rooms-domotics": { day: 1 } }, works: {}, completedLog: [] } };
    expect(advanceHotelEvents(level("economy", 80, domotics), heat, 1).hotelEvents.today.wearChanceBonus).toBe(CLIMATE_WEAR_CHANCE.economy / 2);
  });

  it("no climate event, no extra chance, whatever the level", () => {
    expect(advanceHotelEvents(level("economy"), quiet, 1).hotelEvents.today.wearChanceBonus).toBe(0);
  });

  it("an audit day records its result, once", () => {
    let state = advanceHotelEvents(level("premium", 90), auditDay, 20);
    expect(state.hotelEvents.audits).toHaveLength(1);
    expect(auditOn(state, 20)).toMatchObject({ day: 20, outcome: "label", reputation: AUDIT_LABEL_REPUTATION, untilDay: 20 + AUDIT_LABEL_DAYS });
    state = advanceHotelEvents(state, auditDay, 20);
    expect(state.hotelEvents.audits).toHaveLength(1);
    expect(auditOn(state, 21)).toBeNull();
  });

  it("no audit on an ordinary day", () => {
    expect(advanceHotelEvents({}, quiet, 3).hotelEvents.audits).toEqual([]);
  });

  it("keeps only the last ten audit results", () => {
    let state = {};
    for (let day = 1; day <= 14; day += 1) state = advanceHotelEvents(state, auditDay, day);
    expect(state.hotelEvents.audits).toHaveLength(10);
    expect(state.hotelEvents.audits[0].day).toBe(5);
  });

  it("a label lifts the reputation while it is in force, then stops", () => {
    let state = advanceHotelEvents(level("premium", 90), auditDay, 20);
    state = advanceHotelEvents(state, quiet, 21);
    expect(auditReputationBonus(state)).toBe(AUDIT_LABEL_REPUTATION);
    state = advanceHotelEvents(state, quiet, 20 + AUDIT_LABEL_DAYS);
    expect(auditReputationBonus(state)).toBe(AUDIT_LABEL_REPUTATION);
    state = advanceHotelEvents(state, quiet, 20 + AUDIT_LABEL_DAYS + 1);
    expect(auditReputationBonus(state)).toBe(0);
  });

  it("a warning dents it for a shorter while", () => {
    let state = advanceHotelEvents(level("economy", 40), auditDay, 5);
    state = advanceHotelEvents(state, quiet, 6);
    expect(auditReputationBonus(state)).toBe(AUDIT_WARNING_REPUTATION);
    state = advanceHotelEvents(state, quiet, 5 + AUDIT_WARNING_DAYS + 1);
    expect(auditReputationBonus(state)).toBe(0);
  });

  it("a compliant audit changes nothing", () => {
    const state = advanceHotelEvents(level("standard", 75), auditDay, 5);
    expect(auditOn(state, 5).outcome).toBe("ok");
    expect(auditReputationBonus(advanceHotelEvents(state, quiet, 6))).toBe(0);
  });

  it("does not mutate its input", () => {
    const state = level("economy", 40);
    const snapshot = JSON.stringify(state);
    advanceHotelEvents(state, auditDay, 5);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe("hotelEventsEngine / describeCalendar", () => {
  it("names the season with its demand and effects", () => {
    const calendar = describeCalendar(D("2026-07-15"));
    expect(calendar.season).toMatchObject({ id: "summer", tier: "high", demandPercent: 40 });
    expect(calendar.season.label).toMatch(/haute saison/i);
    expect(calendar.season.effects.join(" ")).toMatch(/demande \+40 %/i);
  });

  it("low season says what to do about it", () => {
    const calendar = describeCalendar(D("2026-11-11"));
    expect(calendar.season.demandPercent).toBe(-30);
    expect(calendar.season.effects.join(" ")).toMatch(/baissez vos prix|marketing/i);
  });

  it("shows the marketing relief in the low-season figure", () => {
    expect(describeCalendar(D("2026-11-11"), { marketing: { budget: 100000 } }).season.demandPercent).toBe(-20);
  });

  it("lists what is going on and what is coming", () => {
    const start = firstDayOf("festival");
    expect(describeCalendar(start).ongoing.map((event) => event.id)).toContain("festival");
    expect(describeCalendar(new Date(start.getTime() - DAY)).upcoming.map((event) => event.id)).toContain("festival");
  });

  it("is a plain, serialisable object", () => {
    const calendar = describeCalendar(D("2026-07-15"));
    expect(JSON.parse(JSON.stringify(calendar))).toEqual(calendar);
  });
});
