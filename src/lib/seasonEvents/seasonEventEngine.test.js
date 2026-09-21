import {
  FOUR_SEASONS,
  PRO_SHARE,
  MICE_REQUEST_FACTOR,
  SHORT_HORIZON,
  LONG_HORIZON,
  POINTS_PER_STAR,
  seasonOfYear,
  isProSeason,
  proShareOn,
  miceRequestFactor,
  describeSeason,
  satisfactionPenaltyOn,
  satisfactionPenaltyForStay,
  eventCalendar,
} from "./seasonEventEngine";
import { EVENT_TYPES, eventsBetween, eventsOn, calendarEffects, seasonIdOn, describeEventEffects, describeCalendar, MAX_PRICE_TOLERANCE } from "../hotelEvents/hotelEventsEngine";

const DAY = 86400000;
const D = (text) => new Date(`${text}T12:00:00Z`);
const plus = (date, days) => new Date(date.getTime() + days * DAY);
const iso = (date) => date.toISOString().slice(0, 10);
const START = D("2026-01-01");

// The first date, from the start of 2026, where `predicate` holds.
function findDate(predicate, from = START, span = 900) {
  for (let i = 0; i < span; i += 1) {
    const date = plus(from, i);
    if (predicate(date)) return date;
  }
  throw new Error("no such date");
}
const firstDayOf = (id) => findDate((date) => eventsOn(date).some((event) => event.id === id && event.dayNumber === 1));

describe("seasonEventEngine / the four seasons", () => {
  it.each([
    ["2026-03-01", "spring"],
    ["2026-04-15", "spring"],
    ["2026-06-20", "spring"],
    ["2026-06-21", "summer"],
    ["2026-07-14", "summer"],
    ["2026-08-31", "summer"],
    ["2026-09-01", "autumn"],
    ["2026-10-31", "autumn"],
    ["2026-11-01", "winter"],
    ["2026-12-25", "winter"],
    ["2027-01-15", "winter"],
    ["2027-02-28", "winter"],
  ])("%s is %s", (date, season) => {
    expect(seasonOfYear(D(date))).toBe(season);
  });

  it("every day of the year is in exactly one of the four", () => {
    const seen = new Set();
    for (let i = 0; i < 366; i += 1) seen.add(seasonOfYear(plus(START, i)));
    expect([...seen].sort()).toEqual(["autumn", "spring", "summer", "winter"]);
  });

  it("agrees with the calendar's own tiers: summer is its high season, the low season is winter", () => {
    for (let i = 0; i < 366; i += 1) {
      const date = plus(START, i);
      if (seasonIdOn(date) === "summer") expect(seasonOfYear(date)).toBe("summer");
      if (seasonIdOn(date) === "low") expect(seasonOfYear(date)).toBe("winter");
    }
  });

  it("has a label, an icon and a description for each", () => {
    Object.values(FOUR_SEASONS).forEach((season) => {
      expect(season.label).toBeTruthy();
      expect(season.icon).toBeTruthy();
      expect(season.description.length).toBeGreaterThan(20);
    });
    expect(Object.values(FOUR_SEASONS).map((season) => season.label)).toEqual(["Printemps", "Été", "Automne", "Hiver"]);
  });

  it("spring and autumn are the professional seasons", () => {
    expect(isProSeason(D("2026-04-15"))).toBe(true);
    expect(isProSeason(D("2026-10-10"))).toBe(true);
    expect(isProSeason(D("2026-07-15"))).toBe(false);
    expect(isProSeason(D("2027-01-15"))).toBe(false);
  });

  it("brings half of the bookings as business guests in those seasons, none by the calendar otherwise", () => {
    expect(proShareOn(D("2026-04-15"))).toBe(PRO_SHARE);
    expect(PRO_SHARE).toBe(0.5);
    expect(proShareOn(D("2026-07-15"))).toBe(0);
  });

  it("makes companies write half as often again for seminars in those seasons", () => {
    expect(miceRequestFactor(D("2026-10-10"))).toBe(MICE_REQUEST_FACTOR);
    expect(MICE_REQUEST_FACTOR).toBe(1.5);
    expect(miceRequestFactor(D("2026-07-15"))).toBe(1);
  });

  it("copes with junk dates", () => {
    expect(["spring", "summer", "autumn", "winter"]).toContain(seasonOfYear("not a date"));
    expect(seasonOfYear(undefined)).toBeTruthy();
  });
});

describe("seasonEventEngine / describing a season", () => {
  it("gives the label, the calendar's tier and its effect on demand", () => {
    const summer = describeSeason(D("2026-07-15"));
    expect(summer).toMatchObject({ id: "summer", label: "Été", icon: "☀️", tier: "high", pro: false, proSharePercent: 0 });
    expect(summer.demandPercent).toBe(40);
    expect(summer.priceTolerancePercent).toBe(20);
    expect(summer.calendarLabel).toMatch(/haute saison/i);
  });

  it("winter's low season cuts the demand and tells the player to use yield management", () => {
    const winter = describeSeason(D("2026-11-11"));
    expect(winter).toMatchObject({ id: "winter", tier: "low", demandPercent: -30 });
    expect(winter.advice).toMatch(/yield management/i);
  });

  it("marketing wins back part of the low season, and the description follows", () => {
    expect(describeSeason(D("2026-11-11"), { marketing: { budget: 8000 } }).demandPercent).toBe(-25);
  });

  it("summer tells the player to raise prices", () => {
    expect(describeSeason(D("2026-07-15")).advice).toMatch(/relevez vos tarifs/i);
  });

  it("spring and autumn talk about the business clientele and give its share", () => {
    const spring = describeSeason(D("2026-04-15"));
    expect(spring).toMatchObject({ id: "spring", pro: true, proSharePercent: 50 });
    expect(spring.advice).toMatch(/business/i);
    expect(describeSeason(D("2026-10-10"))).toMatchObject({ id: "autumn", pro: true });
  });

  it("has nothing to advise on a neutral day of a non-professional season", () => {
    const date = findDate((day) => seasonOfYear(day) === "winter" && seasonIdOn(day) === "shoulder");
    expect(describeSeason(date).advice).toBe("");
  });
});

describe("seasonEventEngine / the new events", () => {
  it("a grand music festival and an international fair: three days, demand +80 %", () => {
    ["music-festival", "international-fair"].forEach((id) => {
      expect(EVENT_TYPES[id]).toMatchObject({ kind: "demand", durationDays: 3, demand: 1.8, premiumFirst: true });
      expect(EVENT_TYPES[id].priceTolerance).toBeGreaterThanOrEqual(0.2);
    });
  });

  it("the festival is a summer thing, the fair a spring and autumn one", () => {
    expect(EVENT_TYPES["music-festival"].months).toEqual([5, 6, 7]);
    expect(EVENT_TYPES["international-fair"].months).toEqual([2, 3, 4, 8, 9, 10]);
  });

  it("roadworks last five days and cost the guests 5 points of satisfaction, with no effect on demand", () => {
    expect(EVENT_TYPES.roadworks).toMatchObject({ kind: "nuisance", durationDays: 5, satisfactionPenalty: 5, demand: 1 });
  });

  it.each(["music-festival", "international-fair", "roadworks"])("%s does happen, for its full duration, in its months", (id) => {
    const type = EVENT_TYPES[id];
    const start = firstDayOf(id);
    expect(type.months).toContain(start.getUTCMonth());
    const days = Array.from({ length: type.durationDays }, (_, i) => eventsOn(plus(start, i)).find((event) => event.id === id));
    days.forEach((day, i) => {
      expect(day).toBeTruthy();
      expect(day.dayNumber).toBe(i + 1);
    });
    expect(eventsOn(plus(start, type.durationDays)).some((event) => event.id === id)).toBe(false);
    expect(eventsOn(plus(start, -1)).some((event) => event.id === id)).toBe(false);
  });

  it("they are announced ahead: the festival and the fair a week, the roadworks three days", () => {
    expect(EVENT_TYPES["music-festival"].noticeDays).toBe(7);
    expect(EVENT_TYPES["international-fair"].noticeDays).toBe(7);
    expect(EVENT_TYPES.roadworks.noticeDays).toBe(3);
  });

  it("the calendar combines them: a festival day lifts demand and price tolerance, capped", () => {
    const date = findDate((day) => {
      const events = eventsOn(day);
      return events.length === 1 && events[0].id === "music-festival";
    });
    const effects = calendarEffects(date);
    expect(effects.eventsDemandFactor).toBeCloseTo(1.8, 10);
    expect(effects.premiumFirst).toBe(true);
    expect(effects.priceTolerance).toBeLessThanOrEqual(MAX_PRICE_TOLERANCE);
    expect(effects.priceTolerance).toBeGreaterThanOrEqual(0.25);
  });

  it("roadworks carry their satisfaction penalty through the calendar, and nothing else does", () => {
    const works = findDate((day) => eventsOn(day).length === 1 && eventsOn(day)[0].id === "roadworks");
    expect(calendarEffects(works).satisfactionPenalty).toBe(5);
    expect(calendarEffects(works).eventsDemandFactor).toBe(1);
    const quiet = findDate((day) => eventsOn(day).length === 0);
    expect(calendarEffects(quiet).satisfactionPenalty).toBe(0);
  });

  it("describes the roadworks' effect in the player's words", () => {
    expect(describeEventEffects(EVENT_TYPES.roadworks).join(" ")).toMatch(/Satisfaction des clients hébergés −5 points/);
    expect(describeEventEffects(EVENT_TYPES["music-festival"]).join(" ")).toMatch(/Demande \+80 %/);
  });

  it("the daily review's calendar announces roadworks with their effect", () => {
    const start = firstDayOf("roadworks");
    const calendar = describeCalendar(plus(start, -2));
    const works = calendar.upcoming.find((event) => event.id === "roadworks");
    expect(works).toBeTruthy();
    expect(works.startsInDays).toBe(2);
    expect(works.effects.join(" ")).toMatch(/−5 points/);
  });

  it("the older events keep their numbers", () => {
    expect(EVENT_TYPES.festival.demand).toBe(1.3);
    expect(EVENT_TYPES["trade-fair"].demand).toBe(1.2);
  });
});

describe("hotelEventsEngine / eventsBetween", () => {
  it("lists what is on and what starts within the horizon, in order", () => {
    const start = firstDayOf("roadworks");
    const list = eventsBetween(plus(start, 1), 10);
    expect(list.find((event) => event.id === "roadworks")).toMatchObject({ startsInDays: -1, dayNumber: 2 });
    for (let i = 1; i < list.length; i += 1) expect(list[i].startsInDays).toBeGreaterThanOrEqual(list[i - 1].startsInDays);
  });

  it("a longer horizon shows at least what a shorter one does", () => {
    for (let i = 0; i < 120; i += 6) {
      const date = plus(START, i);
      const short = eventsBetween(date, 7).map((event) => `${event.id}:${event.startDate}`);
      const long = eventsBetween(date, 30).map((event) => `${event.id}:${event.startDate}`);
      short.forEach((key) => expect(long).toContain(key));
    }
  });

  it("with no days ahead, it is today's events", () => {
    for (let i = 0; i < 200; i += 7) {
      const date = plus(START, i);
      expect(eventsBetween(date, 0).map((event) => event.id).sort()).toEqual(eventsOn(date).map((event) => event.id).sort());
    }
  });
});

describe("seasonEventEngine / roadworks and the guests' satisfaction", () => {
  it("costs the guests staying that night 5 points, and nobody else", () => {
    const start = firstDayOf("roadworks");
    expect(satisfactionPenaltyOn(start)).toBe(5);
    expect(satisfactionPenaltyOn(plus(start, 4))).toBe(5);
    expect(satisfactionPenaltyOn(plus(start, 5))).toBe(0);
    expect(satisfactionPenaltyOn(plus(start, -1))).toBe(0);
  });

  it("a stay that overlaps the works loses the 5 points, once, however long the overlap", () => {
    const start = firstDayOf("roadworks");
    expect(satisfactionPenaltyForStay({ arrival: iso(start), departure: iso(plus(start, 1)) })).toBe(5);
    expect(satisfactionPenaltyForStay({ arrival: iso(start), departure: iso(plus(start, 4)) })).toBe(5);
    expect(satisfactionPenaltyForStay({ arrival: iso(plus(start, -2)), departure: iso(plus(start, 1)) })).toBe(5);
  });

  it("a stay that ends the day the works start, or begins the day they end, is spared", () => {
    const start = firstDayOf("roadworks");
    expect(satisfactionPenaltyForStay({ arrival: iso(plus(start, -3)), departure: iso(start) })).toBe(0);
    expect(satisfactionPenaltyForStay({ arrival: iso(plus(start, 5)), departure: iso(plus(start, 7)) })).toBe(0);
  });

  it("a stay with no dates loses nothing", () => {
    expect(satisfactionPenaltyForStay({})).toBe(0);
    expect(satisfactionPenaltyForStay(undefined)).toBe(0);
  });

  it("points are turned into stars at 20 to the star", () => {
    expect(POINTS_PER_STAR).toBe(20);
  });
});

describe("seasonEventEngine / the agenda", () => {
  const date = firstDayOf("music-festival");

  it("shows an event a week ahead in the short view and a month ahead in the long one", () => {
    const far = plus(date, -20);
    expect(eventCalendar(far, {}, SHORT_HORIZON).some((event) => event.id === "music-festival")).toBe(false);
    expect(eventCalendar(far, {}, LONG_HORIZON).some((event) => event.id === "music-festival")).toBe(true);
    expect(eventCalendar(plus(date, -5), {}, SHORT_HORIZON).some((event) => event.id === "music-festival")).toBe(true);
  });

  it("the long view always contains the short one", () => {
    for (let i = 0; i < 300; i += 9) {
      const day = plus(START, i);
      const short = eventCalendar(day, {}, SHORT_HORIZON).map((event) => `${event.id}:${event.startDate}`);
      const long = eventCalendar(day, {}, LONG_HORIZON).map((event) => `${event.id}:${event.startDate}`);
      short.forEach((key) => expect(long).toContain(key));
    }
  });

  it("is sorted by start", () => {
    const list = eventCalendar(plus(date, -25), {}, LONG_HORIZON);
    for (let i = 1; i < list.length; i += 1) expect(list[i].startsInDays).toBeGreaterThanOrEqual(list[i - 1].startsInDays);
  });

  it("never shows the surprise audit, nor a heat or cold wave beyond its forecast", () => {
    for (let i = 0; i < 400; i += 5) {
      const day = plus(START, i);
      eventCalendar(day, {}, LONG_HORIZON).forEach((event) => {
        expect(event.kind).not.toBe("audit");
        if (event.kind === "climate") expect(event.startsInDays).toBeLessThanOrEqual(EVENT_TYPES[event.id].noticeDays);
      });
    }
  });

  it("flags the demand events as opportunities, with their numbers and what to do", () => {
    const [festival] = eventCalendar(plus(date, -3), {}, SHORT_HORIZON).filter((event) => event.id === "music-festival");
    expect(festival).toMatchObject({ opportunity: true, premium: true, demandPercent: 80, priceTolerancePercent: 25, ongoing: false, startsInDays: 3, totalDays: 3 });
    expect(festival.advice).toMatch(/relevez vos tarifs.*\+25 %.*stocks.*\+80 %/);
  });

  it("flags roadworks as a nuisance, not an opportunity, with their penalty", () => {
    const start = firstDayOf("roadworks");
    const works = eventCalendar(plus(start, -2), {}, SHORT_HORIZON).find((event) => event.id === "roadworks");
    expect(works).toMatchObject({ opportunity: false, satisfactionPenalty: 5, demandPercent: 0, kind: "nuisance" });
    expect(works.advice).toMatch(/réception.*−5 points/);
  });

  it("marks an event in progress", () => {
    const list = eventCalendar(plus(date, 1), {}, SHORT_HORIZON);
    expect(list.find((event) => event.id === "music-festival")).toMatchObject({ ongoing: true, dayNumber: 2 });
  });

  it("can be empty", () => {
    const empty = findDate((day) => eventCalendar(day, {}, SHORT_HORIZON).length === 0);
    expect(eventCalendar(empty, {}, SHORT_HORIZON)).toEqual([]);
  });
});
