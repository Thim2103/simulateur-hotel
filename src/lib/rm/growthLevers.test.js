import { computeDemand, generateBookings, applyDemand, describeDemand } from "../demand/demandEngine";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildDailyReview } from "../dashboard/dailyReview";
import { setYieldEnabled, setYieldRule } from "./yieldManagementEngine";
import { launchTargetedCampaign, activeCampaigns, campaignHistory } from "../marketing/targetedCampaigns";
import { eventsOn, seasonIdOn } from "../hotelEvents/hotelEventsEngine";

const D = (text) => new Date(`${text}T12:00:00Z`);
const DAY = 86400000;
const iso = (date) => date.toISOString().slice(0, 10);
function findDate(test, from = "2026-01-01") {
  for (let i = 0; i < 800; i += 1) {
    const date = new Date(D(from).getTime() + i * DAY);
    if (test(date)) return date;
  }
  throw new Error("no date found");
}
// A weekday (Mon) with nothing going on for the next two weeks, so only the lever under test moves.
const CALM_MON = findDate((d) => d.getUTCDay() === 1 && Array.from({ length: 14 }, (_, i) => new Date(d.getTime() + i * DAY)).every((day) => eventsOn(day).length === 0 && seasonIdOn(day) === "shoulder"));
const LOW_MON = findDate((d) => d.getUTCDay() === 1 && Array.from({ length: 14 }, (_, i) => new Date(d.getTime() + i * DAY)).every((day) => eventsOn(day).length === 0 && seasonIdOn(day) === "low"));

const rooms = (count = 10, type = "standard") => Array.from({ length: count }, (_, i) => ({ id: i + 1, number: String(100 + i), type, status: "libre", price: 100 }));
const rich = (extra = {}) => ({ finance: { revenue: [100000], costs: [0] }, ...extra });
const withCampaign = (typeId, date, hotelState = rich()) => launchTargetedCampaign({ hotelState }, typeId, { date }).hotelState;
const demand = (hotelState, date, list = rooms()) => computeDemand({ hotelState, rooms: list, reservations: [], referenceDate: date });

describe("growth levers / marketing is the sixth demand factor", () => {
  it("is neutral without a campaign", () => {
    expect(demand({}, CALM_MON).factors.marketing).toBe(1);
  });

  it("a digital campaign lifts demand by 10 %", () => {
    const state = withCampaign("digital", CALM_MON);
    expect(demand(state, CALM_MON).factors.marketing).toBeCloseTo(1.1);
    expect(demand(state, CALM_MON).multiplier).toBeCloseTo(demand({}, CALM_MON).multiplier * 1.1);
  });

  it("a corporate partnership lifts weekday demand only", () => {
    const state = withCampaign("corporate", CALM_MON);
    expect(demand(state, CALM_MON).factors.marketing).toBeCloseTo(1.2);
    expect(demand(state, new Date(CALM_MON.getTime() + 5 * DAY)).factors.marketing).toBe(1); // Saturday
  });

  it("the low-season promotion softens the low-season slump", () => {
    const plain = demand({}, LOW_MON).multiplier;
    const promoted = demand(withCampaign("low-season", LOW_MON), LOW_MON).multiplier;
    expect(promoted / plain).toBeCloseTo(1.15);
    expect(demand(withCampaign("low-season", LOW_MON), LOW_MON).multiplier).toBeGreaterThan(plain);
  });

  it("the same promotion is nearly useless outside the low season", () => {
    expect(demand(withCampaign("low-season", CALM_MON), CALM_MON).factors.marketing).toBeCloseTo(1.02);
  });

  it("the demand reading credits marketing when it is what lifted demand", () => {
    const report = { multiplier: 1.3, factors: { reputation: 1, price: 1, season: 1, events: 1, incidents: 1, marketing: 1.3 }, newBookings: 3, turnedAway: 0 };
    expect(describeDemand(report).headline).toMatch(/campagnes marketing/i);
  });

  it("an expired campaign no longer counts", () => {
    const state = withCampaign("digital", CALM_MON);
    expect(demand(state, new Date(CALM_MON.getTime() + 8 * DAY)).factors.marketing).toBe(1);
  });
});

describe("growth levers / marketing shapes who books", () => {
  const book = (options) => generateBookings({ rooms: rooms(10), reservations: [], referenceDate: CALM_MON, multiplier: 3, ...options });
  const segments = (result) => result.reservations.map((reservation) => reservation.segment);

  it("a targeted segment takes most of the bookings, on top of the usual mix", () => {
    const plain = segments(book({}));
    const biased = segments(book({ segmentBias: "business" }));
    expect(biased.filter((segment) => segment === "business").length).toBeGreaterThan(plain.filter((segment) => segment === "business").length);
    expect(biased.filter((segment) => segment === "business").length).toBeGreaterThanOrEqual((biased.length * 2) / 3);
    const leisure = segments(book({ segmentBias: "leisure" }));
    expect(leisure.filter((segment) => segment === "leisure").length).toBeGreaterThan(plain.filter((segment) => segment === "leisure").length);
  });

  it("no bias, no change to the segments", () => {
    expect(segments(book({}))).toEqual(segments(book({ segmentBias: null })));
  });
});

describe("growth levers / yield management prices the bookings", () => {
  const rows = rooms(10);
  const pricer = (multiplier, rules = ["occupancy"]) => () => ({ multiplier, rules });
  const book = (priceAdjust) => generateBookings({ rooms: rows, reservations: [], referenceDate: CALM_MON, multiplier: 2, priceAdjust });

  it("without a pricer, prices are exactly what they were", () => {
    expect(book(null).reservations.every((reservation) => reservation.price === 100)).toBe(true);
    expect(book(null).adjustments).toEqual([]);
  });

  it("applies the multiplier to every booking and reports each adjustment", () => {
    const result = book(pricer(1.15));
    expect(result.reservations.every((reservation) => reservation.price === 115)).toBe(true);
    expect(result.adjustments).toHaveLength(result.created);
    expect(result.adjustments[0]).toMatchObject({ rules: ["occupancy"] });
  });

  it("the delta of an adjustment is its price difference over the whole stay", () => {
    const result = book(pricer(1.15));
    const first = result.reservations[0];
    const nights = Math.round((new Date(first.departure) - new Date(first.arrival)) / DAY);
    expect(result.adjustments[0].delta).toBe(15 * nights);
  });

  it("a discount is a negative delta", () => {
    const result = book(pricer(0.8, ["lastMinute"]));
    expect(result.reservations[0].price).toBe(80);
    expect(result.adjustments.every((entry) => entry.delta < 0)).toBe(true);
  });

  it("a multiplier of 1 is not reported as an adjustment", () => {
    expect(book(pricer(1)).adjustments).toEqual([]);
  });

  it("does not change how many bookings are made", () => {
    expect(book(pricer(1.15)).created).toBe(book(null).created);
  });

  it("reports the value of the day's new bookings (price x nights)", () => {
    const result = book(null);
    const expected = result.reservations.reduce((sum, reservation) => sum + reservation.price * Math.round((new Date(reservation.departure) - new Date(reservation.arrival)) / DAY), 0);
    expect(result.newBookingsValue).toBe(expected);
  });

  it("the pricer sees the bookings already made today, so a filling hotel gets pricier", () => {
    const seen = [];
    generateBookings({ rooms: rows, reservations: [], referenceDate: CALM_MON, multiplier: 2, priceAdjust: (room, arrival, all) => (seen.push(all.length), { multiplier: 1, rules: [] }) });
    expect(Math.max(...seen)).toBeGreaterThan(0);
  });
});

describe("growth levers / applyDemand", () => {
  const fullHotel = () => ({ hotelState: {}, rooms: rooms(20), reservations: [], referenceDate: CALM_MON });

  it("reports the levers: marketing factor and campaigns, yield summary", () => {
    const report = applyDemand({ ...fullHotel(), hotelState: withCampaign("digital", CALM_MON) }).demandReport;
    expect(report.levers.marketing.factor).toBeCloseTo(1.1);
    expect(report.levers.marketing.campaigns[0]).toMatchObject({ typeId: "digital" });
    expect(report.levers.yield).toMatchObject({ enabled: false, adjusted: 0, revenueDelta: 0 });
    expect(report.newBookingsValue).toBeGreaterThan(0);
  });

  it("with Yield Management on, the report says what it changed", () => {
    // Fill the hotel first so the occupancy rule bites.
    const fill = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, room_id: i + 1, status: "confirmée", arrival: iso(CALM_MON), departure: iso(new Date(CALM_MON.getTime() + 3 * DAY)), price: 100 }));
    const on = setYieldEnabled({ hotelState: {} }, true).hotelState;
    const report = applyDemand({ hotelState: on, rooms: rooms(20), reservations: fill, referenceDate: CALM_MON }).demandReport;
    expect(report.levers.yield.enabled).toBe(true);
    // No room is free, so nothing could be booked: the summary is empty but present.
    expect(report.levers.yield.adjusted).toBe(0);
  });

  it("a hotel with Yield Management on prices bookings above the plain price when it is filling up", () => {
    // (the last-minute discount is switched off, or it would cancel the rise out)
    const state = setYieldRule(setYieldRule(setYieldEnabled({ hotelState: {} }, true), "occupancy", { threshold: 0, adjustment: 0.2 }), "lastMinute", { enabled: false }).hotelState;
    const result = applyDemand({ hotelState: state, rooms: rooms(20), reservations: [], referenceDate: CALM_MON });
    const raised = result.reservations.filter((reservation) => reservation.price > 100);
    expect(raised.length).toBeGreaterThan(0);
    expect(result.demandReport.levers.yield.adjusted).toBe(raised.length);
    expect(result.demandReport.levers.yield.revenueDelta).toBeGreaterThan(0);
    expect(result.demandReport.levers.yield.byRule.occupancy).toBe(raised.length);
  });

  it("is deterministic", () => {
    const on = setYieldEnabled({ hotelState: {} }, true).hotelState;
    expect(applyDemand({ hotelState: on, rooms: rooms(20), reservations: [], referenceDate: CALM_MON })).toEqual(applyDemand({ hotelState: on, rooms: rooms(20), reservations: [], referenceDate: CALM_MON }));
  });
});

describe("growth levers / through the career day", () => {
  function career(startDate, hotelExtra = {}) {
    return startCareer({
      playerId: "p",
      startDate,
      hotelState: { finance: { revenue: [100000], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {}, expansion: { availableCapital: 100000 }, ...hotelExtra },
      restaurantState: {
        finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
        menu: [{ price: 20, cost: 8, sales: 10 }],
        staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
        operations: [],
        marketing: { budget: 0 },
        esg: {},
      },
      rooms: rooms(12).map((room) => ({ ...room, housekeeping_status: "clean" })),
      reservations: [],
    });
  }
  const play = async (state, days) => {
    let current = state;
    for (let i = 0; i < days; i += 1) ({ state: current } = await runCareerDay({ state: current, rng: () => 0.999 }));
    return current;
  };
  const dashboard = { kpis: { revenueToday: 0, profit: 0, satisfaction: 3, staffMorale: 50, occupancyRate: 0, date: "d" } };

  it("a campaign launched for the day is credited with its extra bookings, and reported", async () => {
    let state = career(iso(CALM_MON));
    state = { ...state, hotel: launchTargetedCampaign(state.hotel, "digital", { date: CALM_MON, day: 0 }) };
    state = await play(state, 2);
    const [campaign] = activeCampaigns(state.hotel.hotelState);
    expect(campaign.extraBookings).toBeGreaterThan(0);
    expect(campaign.extraRevenue).toBeGreaterThan(0);
    const review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    expect(review.growth.marketingFactor).toBeCloseTo(1.1);
    expect(review.growth.running[0]).toMatchObject({ typeId: "digital", daysLeft: 6 });
  });

  it("a campaign is closed on its end date, with its ROI in the review", async () => {
    let state = career(iso(CALM_MON));
    state = { ...state, hotel: launchTargetedCampaign(state.hotel, "digital", { date: CALM_MON, day: 0 }) };
    state = await play(state, 7);
    expect(activeCampaigns(state.hotel.hotelState)).toHaveLength(0);
    expect(campaignHistory(state.hotel.hotelState)).toHaveLength(1);
    const review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    expect(review.growth.ended).toHaveLength(1);
    expect(review.causalChain.some((line) => /Campagne « Campagne digitale & réseaux sociaux » terminée.*ROI/.test(line))).toBe(true);
  });

  it("with Yield Management on, the review reports the price adjustments", async () => {
    let state = career(iso(CALM_MON));
    const on = setYieldRule(setYieldEnabled(state.hotel, true), "occupancy", { threshold: 0, adjustment: 0.2 });
    state = { ...state, hotel: on };
    state = await play(state, 3);
    const review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    expect(review.growth.yield.enabled).toBe(true);
    expect(review.growth.yield.adjusted).toBeGreaterThan(0);
    expect(review.growth.yield.revenueDelta).toBeGreaterThan(0);
    expect(review.causalChain.some((line) => /Yield management : \d+ réservation/.test(line))).toBe(true);
  });

  it("a hotel that uses neither lever has no growth section", async () => {
    const state = await play(career(iso(CALM_MON)), 2);
    expect(buildDailyReview({ careerState: state, dashboardState: dashboard }).growth).toBeNull();
    expect(state.hotel.hotelState.targetedCampaigns).toBeUndefined();
    expect(state.hotel.hotelState.yieldManagement).toBeUndefined();
  });

  it("the campaign's cost lands in the finance costs of the month", async () => {
    let state = career(iso(CALM_MON));
    const before = state.hotel.hotelState.finance.costs[0];
    state = { ...state, hotel: launchTargetedCampaign(state.hotel, "corporate", { date: CALM_MON, day: 0 }) };
    expect(state.hotel.hotelState.finance.costs[0] - before).toBe(4000);
  });
});
