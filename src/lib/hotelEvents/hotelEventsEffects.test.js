import { computeDemand, generateBookings, applyDemand, seasonFactor, priceFactor } from "../demand/demandEngine";
import { calculateExpenses } from "../dailyCycle/calculateExpenses";
import { runHousekeepingCycle } from "../housekeeping/housekeepingEngine";
import { calculateReputation } from "../progression/reputation";
import { reconcileIncidents } from "../maintenance/incidentEngine";
import { recordMaintenance, hotelCondition, wearChance } from "../maintenance/maintenanceCostEngine";
import { startCareer, runCareerDay, careerReferenceDate } from "../career/careerEngine";
import { buildDailyReview } from "../dashboard/dailyReview";
import {
  SEASON_TIERS,
  EVENT_TYPES,
  AUDIT_LABEL_REPUTATION,
  eventsOn,
  seasonIdOn,
  calendarEffects,
  advanceHotelEvents,
  todaySnapshot,
  auditOn,
} from "./hotelEventsEngine";

const D = (text) => new Date(`${text}T12:00:00Z`);
const DAY = 86400000;
function findDate(test, from = "2026-01-01", limit = 1500) {
  for (let i = 0; i < limit; i += 1) {
    const date = new Date(D(from).getTime() + i * DAY);
    if (test(date)) return date;
  }
  throw new Error("no date found");
}
const onlyEvent = (id) => (date) => eventsOn(date).length === 1 && eventsOn(date)[0].id === id;
const quietOf = (season) => (date) => eventsOn(date).length === 0 && seasonIdOn(date) === season;
// Same weekday for the comparisons, so only the calendar differs.
const sameWeekday = (date, weekday) => date.getUTCDay() === weekday;

const rooms = (count = 10, type = "standard") => Array.from({ length: count }, (_, i) => ({ id: i + 1, number: String(100 + i), type, status: "libre", price: 120 }));
const demand = (hotelState, referenceDate) => computeDemand({ hotelState, rooms: rooms(), reservations: [], referenceDate });

describe("hotel events / demand: the season", () => {
  const summer = findDate((d) => quietOf("summer")(d) && sameWeekday(d, 3));
  const shoulder = findDate((d) => quietOf("shoulder")(d) && sameWeekday(d, 3));
  const low = findDate((d) => quietOf("low")(d) && sameWeekday(d, 3));

  it("high season lifts demand by 40 %, low season cuts it by 30 %", () => {
    expect(seasonFactor(shoulder)).toBeCloseTo(1); // Wednesday: no weekday effect
    expect(seasonFactor(summer) / seasonFactor(shoulder)).toBeCloseTo(1.4);
    expect(seasonFactor(low) / seasonFactor(shoulder)).toBeCloseTo(0.7);
  });

  it("shows in the day's demand multiplier", () => {
    expect(demand({}, summer).multiplier).toBeGreaterThan(demand({}, shoulder).multiplier);
    expect(demand({}, low).multiplier).toBeLessThan(demand({}, shoulder).multiplier);
    expect(demand({}, summer).factors.season).toBeCloseTo(SEASON_TIERS.high.demand);
  });

  it("marketing softens the low season", () => {
    const budget = (amount) => demand({ marketing: { budget: amount } }, low).factors.season;
    expect(budget(20000)).toBeGreaterThan(budget(500));
    expect(budget(500)).toBeCloseTo(0.7);
  });

  it("still exposes exactly the five demand factors", () => {
    expect(Object.keys(demand({}, summer).factors).sort()).toEqual(["events", "incidents", "price", "reputation", "season"]);
  });
});

describe("hotel events / demand: high season tolerates higher prices", () => {
  it("the price factor is kinder at a raised price in high season", () => {
    const summer = findDate(quietOf("summer"));
    const shoulder = findDate(quietOf("shoulder"));
    const reservations = [{ id: 1, room_id: 1, status: "confirmée", price: 144, departure: "2099-01-01" }]; // +20 % over base
    const at = (date) => computeDemand({ hotelState: {}, rooms: rooms(1), reservations, referenceDate: date }).factors.price;
    expect(at(summer)).toBeGreaterThan(at(shoulder));
    expect(at(summer)).toBeCloseTo(priceFactor(1.2, 60, SEASON_TIERS.high.priceTolerance), 5);
  });
});

describe("hotel events / demand: events", () => {
  it("a festival lifts the events factor by about 30 %", () => {
    const date = findDate(onlyEvent("festival"));
    expect(demand({}, date).factors.events).toBeCloseTo(EVENT_TYPES.festival.demand);
  });

  it("a trade fair lifts it by 20 %, a heat wave lowers it a little", () => {
    expect(demand({}, findDate(onlyEvent("trade-fair"))).factors.events).toBeCloseTo(1.2);
    expect(demand({}, findDate(onlyEvent("heatwave"))).factors.events).toBeCloseTo(0.95);
  });

  it("stacks with the ambient random events already in the hotel state", () => {
    const date = findDate(onlyEvent("festival"));
    const withAmbient = demand({ progression: { activeEvents: [{ impact: { revenue: 100 } }] } }, date).factors.events;
    expect(withAmbient).toBeCloseTo(1.05 * 1.3);
  });

  it("a quiet day leaves the events factor alone", () => {
    expect(demand({}, findDate(quietOf("shoulder"))).factors.events).toBe(1);
  });

  it("carries the high-end preference of the day", () => {
    expect(demand({}, findDate(onlyEvent("festival"))).premiumFirst).toBe(true);
    expect(demand({}, findDate(quietOf("shoulder"))).premiumFirst).toBe(false);
  });
});

describe("hotel events / demand: the high-end guests take the best rooms", () => {
  const mixed = [
    ...rooms(6, "standard"),
    { id: 7, number: "201", type: "deluxe", status: "libre", price: 200 },
    { id: 8, number: "301", type: "suite", status: "libre", price: 350 },
  ];
  const book = (premiumFirst, multiplier = 1.5) => generateBookings({ rooms: mixed, reservations: [], referenceDate: D("2026-07-15"), multiplier, premiumFirst });
  const premiumShare = (result) => result.reservations.filter((r) => r.room_type === "deluxe" || r.room_type === "suite").length / result.reservations.length;

  it("with high-end guests in town, deluxe rooms and suites are booked first", () => {
    const first = book(true).reservations[0];
    expect(["deluxe", "suite"]).toContain(first.room_type);
  });

  it("without, bookings spread over every room as before", () => {
    expect(premiumShare(book(false))).toBeLessThan(premiumShare(book(true)) + 0.0001);
    expect(book(false).reservations.some((r) => r.room_type === "standard")).toBe(true);
  });

  it("the rest still fill the standard rooms once the premium ones are taken", () => {
    const result = book(true, 4);
    expect(result.reservations.some((r) => r.room_type === "standard")).toBe(true);
  });

  it("does not change how many bookings are made", () => {
    expect(book(true).created).toBe(book(false).created);
  });

  it("is deterministic", () => {
    expect(book(true)).toEqual(book(true));
  });

  it("applyDemand passes the day's preference to the bookings", () => {
    const date = findDate(onlyEvent("festival"));
    const result = applyDemand({ hotelState: {}, rooms: mixed, reservations: [], referenceDate: date });
    const first = result.reservations[0];
    expect(["deluxe", "suite"]).toContain(first.room_type);
  });
});

describe("hotel events / running costs", () => {
  const finance = { payroll: 30000, fixedCosts: 3000 };
  const bill = (hotelState, referenceDate) => calculateExpenses({ hotelState: { finance, ...hotelState }, referenceDate }).total;

  it("a heat wave raises the day's energy bill", () => {
    const heat = findDate(onlyEvent("heatwave"));
    const quiet = findDate(quietOf("shoulder"));
    expect(bill({}, heat) - bill({}, quiet)).toBe(EVENT_TYPES.heatwave.energyExtra);
  });

  it("a cold wave too", () => {
    expect(bill({}, findDate(onlyEvent("coldwave"))) - bill({}, findDate(quietOf("shoulder")))).toBe(EVENT_TYPES.coldwave.energyExtra);
  });

  it("domotics halve it", () => {
    const heat = findDate(onlyEvent("heatwave"));
    const domotics = { zoneUpgrades: { installed: { "rooms-domotics": { day: 1 } }, works: {}, completedLog: [] } };
    const extraWith = bill(domotics, heat) - bill(domotics, findDate(quietOf("shoulder")));
    expect(extraWith).toBe(EVENT_TYPES.heatwave.energyExtra / 2);
  });

  it("no date, no extra (existing callers are unaffected)", () => {
    expect(calculateExpenses({ hotelState: { finance } }).total).toBe(calculateExpenses({ hotelState: { finance }, referenceDate: findDate(quietOf("shoulder")) }).total);
  });
});

describe("hotel events / housekeeping", () => {
  const cleaning = (hotelState) =>
    runHousekeepingCycle({
      hotelBundle: {
        hotelState: { finance: { payroll: 38000 }, housekeeping: { staffingBonus: 0, trainingLevel: 50, processEfficiency: 50 }, ...hotelState },
        restaurantState: {},
        rooms: [{ id: 1, number: "101", status: "occupée", housekeeping_status: "dirty" }],
        reservations: [],
      },
      staffProductivity: 70,
      hotelHeadcount: 15,
      referenceDate: D("2026-09-10"),
    });

  it("high season makes the cleaning take longer", () => {
    const summer = advanceHotelEvents({}, findDate(quietOf("summer")), 1);
    expect(cleaning(summer).cleaningTime.totalMinutes).toBeGreaterThan(cleaning({}).cleaningTime.totalMinutes);
  });

  it("a festival does too", () => {
    const festival = advanceHotelEvents({}, findDate(onlyEvent("festival")), 1);
    expect(cleaning(festival).cleaningTime.totalMinutes).toBeGreaterThan(cleaning({}).cleaningTime.totalMinutes);
  });

  it("a quiet day changes nothing", () => {
    const quiet = advanceHotelEvents({}, findDate(quietOf("shoulder")), 1);
    expect(cleaning(quiet).cleaningTime.totalMinutes).toBe(cleaning({}).cleaningTime.totalMinutes);
  });
});

describe("hotel events / wear", () => {
  const heat = findDate(onlyEvent("heatwave"));
  const quiet = findDate(quietOf("shoulder"));
  const played = (hotelState, date, day = 1) => advanceHotelEvents(hotelState, date, day);
  const bill = { rooms: 30, equipment: 0, floors: 0, total: 30 };

  it("a heat wave wears the hotel down faster than a quiet day", () => {
    const hot = hotelCondition(recordMaintenance(played({ maintenance: { level: "standard", condition: 80 } }, heat), bill, 1));
    const calm = hotelCondition(recordMaintenance(played({ maintenance: { level: "standard", condition: 80 } }, quiet), bill, 1));
    expect(calm).toBe(80);
    expect(hot).toBeLessThan(calm);
  });

  it("Premium absorbs half of that pressure", () => {
    const loss = (level) => 80 + (level === "premium" ? 0.5 : level === "economy" ? -1 : 0) - hotelCondition(recordMaintenance(played({ maintenance: { level, condition: 80 } }, heat), bill, 1));
    expect(loss("premium")).toBeCloseTo(loss("standard") / 2);
  });

  it("the pressure applies only to the day it was snapshotted for", () => {
    const state = played({ maintenance: { level: "standard", condition: 80 } }, heat, 5);
    expect(hotelCondition(recordMaintenance(state, bill, 6))).toBe(80);
  });

  it("a heat wave makes wear breakdowns possible even in a well-kept hotel on the Économique level", () => {
    const economy = played({ maintenance: { level: "economy", condition: 90 } }, heat);
    const standard = played({ maintenance: { level: "standard", condition: 90 } }, heat);
    const premium = played({ maintenance: { level: "premium", condition: 90 } }, heat);
    expect(wearChance(economy)).toBeGreaterThan(wearChance(standard));
    expect(wearChance(standard)).toBeGreaterThan(wearChance(premium));
    expect(wearChance(premium)).toBe(0);
  });

  it("and they really happen: economy breaks down over a long heat wave, premium never", () => {
    const run = (level) => {
      let state = { maintenance: { level, condition: 90 } };
      let broken = 0;
      for (let day = 1; day <= 200; day += 1) {
        state = { ...state, hotelEvents: { today: { day, wearChanceBonus: level === "economy" ? 0.15 : 0 } } };
        broken += reconcileIncidents({ ...state, activeIncidents: [] }, [], day).activeIncidents.length;
      }
      return broken;
    };
    expect(run("economy")).toBeGreaterThan(10);
    expect(run("premium")).toBe(0);
  });

  it("no climate event, no extra chance", () => {
    expect(wearChance(played({ maintenance: { level: "economy", condition: 90 } }, quiet))).toBe(0);
  });
});

describe("hotel events / reputation", () => {
  const audit = findDate(onlyEvent("hygiene-audit"));
  const reputation = (hotelState) => calculateReputation({ hotelState, restaurantState: {}, previousReputation: 50 });

  it("a quality label lifts the reputation the next day", () => {
    let state = advanceHotelEvents({ maintenance: { level: "premium", condition: 95 } }, audit, 10);
    state = advanceHotelEvents(state, findDate(quietOf("shoulder")), 11);
    expect(reputation(state)).toBeGreaterThan(reputation({ maintenance: { level: "premium", condition: 95 } }));
    expect(reputation(state) - reputation({})).toBeGreaterThanOrEqual(AUDIT_LABEL_REPUTATION - 1);
  });

  it("a warning dents it", () => {
    let state = advanceHotelEvents({ maintenance: { level: "economy", condition: 40 } }, audit, 10);
    state = advanceHotelEvents(state, findDate(quietOf("shoulder")), 11);
    expect(reputation(state)).toBeLessThan(reputation({}));
  });

  it("without any audit, the reputation is what it always was", () => {
    expect(reputation({})).toBe(reputation({ hotelEvents: { today: { day: 4 }, audits: [] } }));
  });
});

describe("hotel events / through the career day", () => {
  function career(startDate) {
    return startCareer({
      playerId: "p",
      startDate,
      hotelState: { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {}, expansion: { availableCapital: 100000 } },
      restaurantState: {
        finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
        menu: [{ price: 20, cost: 8, sales: 10 }],
        staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
        operations: [],
        marketing: { budget: 0 },
        esg: {},
      },
      rooms: [
        { id: 1, number: "101", type: "standard", price: 100, status: "libre", housekeeping_status: "clean" },
        { id: 2, number: "102", type: "suite", price: 300, status: "libre", housekeeping_status: "clean" },
      ],
      reservations: [],
    });
  }
  const iso = (date) => date.toISOString().slice(0, 10);
  const play = async (state, days) => {
    let current = state;
    for (let i = 0; i < days; i += 1) ({ state: current } = await runCareerDay({ state: current, rng: () => 0.999 }));
    return current;
  };
  const dashboard = { kpis: { revenueToday: 0, profit: 0, satisfaction: 3, staffMorale: 50, occupancyRate: 0, date: "d" } };

  it("a played day snapshots its date, season and events", async () => {
    const start = findDate(quietOf("summer"));
    const state = await play(career(iso(start)), 1);
    expect(todaySnapshot(state.hotel.hotelState)).toMatchObject({ date: iso(start), day: 1, season: "summer", events: [] });
  });

  it("the snapshot follows the calendar from one day to the next", async () => {
    const start = findDate(quietOf("shoulder"));
    const state = await play(career(iso(start)), 3);
    expect(todaySnapshot(state.hotel.hotelState).date).toBe(iso(new Date(start.getTime() + 2 * DAY)));
    expect(todaySnapshot(state.hotel.hotelState).day).toBe(3);
  });

  it("high season fills the hotel faster than low season", async () => {
    const summer = await play(career(iso(findDate((d) => quietOf("summer")(d) && sameWeekday(d, 1)))), 4);
    const low = await play(career(iso(findDate((d) => quietOf("low")(d) && sameWeekday(d, 1)))), 4);
    const total = (state) => state.hotel.reservations.length;
    expect(total(summer)).toBeGreaterThanOrEqual(total(low));
  });

  it("an audit day records its result and the review reports it", async () => {
    const audit = findDate(onlyEvent("hygiene-audit"));
    const state = await play(career(iso(audit)), 1);
    expect(auditOn(state.hotel.hotelState, 1)).toMatchObject({ day: 1, outcome: "ok" });
    const review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    expect(review.calendar.audit.outcome).toBe("ok");
    expect(review.causalChain.some((line) => /audit hôtelier/i.test(line))).toBe(true);
    expect(review.calendar.ongoing.map((event) => event.id)).toContain("hygiene-audit");
  });

  it("the review announces an event a few days ahead", async () => {
    const festival = findDate(onlyEvent("festival"));
    const state = await play(career(iso(new Date(festival.getTime() - 3 * DAY))), 1); // played day = festival - 3 => starts in 3 days
    const review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    expect(review.calendar.upcoming.map((event) => event.id)).toContain("festival");
    expect(review.causalChain.some((line) => /Festival local dans 3 jours/.test(line))).toBe(true);
  });

  it("the review says when an event ends", async () => {
    const start = firstDay("festival");
    const state = await play(career(iso(new Date(start.getTime() + 2 * DAY))), 1); // last day of the festival
    const review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    expect(review.calendar.ongoing.find((event) => event.id === "festival").endsToday).toBe(true);
    expect(review.causalChain.some((line) => /Festival local se termine aujourd'hui/.test(line))).toBe(true);
  });

  it("no calendar section before any day was played", () => {
    expect(buildDailyReview({ careerState: { day: 0, hotel: { hotelState: {} } }, dashboardState: dashboard }).calendar).toBeNull();
  });

  it("the date the banner describes is the day about to be played", async () => {
    const start = findDate(quietOf("shoulder"));
    const state = await play(career(iso(start)), 2);
    expect(iso(careerReferenceDate(state))).toBe(iso(new Date(start.getTime() + 2 * DAY)));
  });
});

function firstDay(id) {
  return findDate((date) => eventsOn(date).some((event) => event.id === id && event.dayNumber === 1));
}
