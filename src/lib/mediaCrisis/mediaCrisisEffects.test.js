import { computeDemand, describeDemand, applyDemand } from "../demand/demandEngine";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildDailyReview } from "../dashboard/dailyReview";
import { toIsoDate, dayIndexOf } from "../hotelEvents/hotelEventsEngine";
import { advanceMediaCrisis, respondToCrisis, activeCrisis, crisisHistory, MIN_DAY, APOLOGY_COST } from "./mediaCrisisEngine";

const DAY = 86400000;
const D = (text) => new Date(`${text}T12:00:00Z`);
const iso = (date) => toIsoDate(date);
const plus = (text, days) => toIsoDate((dayIndexOf(text) + days) * DAY);
const START = "2026-04-06"; // a shoulder-season Monday: neutral season factor
const ONSET = "2026-04-15";

const rooms = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, number: `10${i + 1}`, type: "standard", price: 120, status: "libre", capacity: 2, housekeeping_status: "clean" }));
const audit = (date, day = 9) => ({ hotelEvents: { today: null, audits: [{ id: `audit:${date}`, day, date, score: 30, outcome: "warning", reputation: -4, untilDay: day + 15 }] } });
const hotel = (extra = {}) => ({ progression: { player: { reputation: 60 } }, finance: { revenue: [50000], costs: [0] }, ...extra });
const crisisHotel = (extra = {}) => advanceMediaCrisis(hotel({ ...audit(ONSET), ...extra }), { date: ONSET, day: 9 });

describe("mediaCrisis / demand", () => {
  const demand = (hotelState, date) => computeDemand({ hotelState, rooms, reservations: [], referenceDate: D(date) });

  it("adds no factor, and changes nothing, without a crisis (still six factors)", () => {
    const { factors } = demand(hotel(), plus(ONSET, 1));
    expect(Object.keys(factors).sort()).toEqual(["events", "incidents", "marketing", "price", "reputation", "season"]);
  });

  it("lists a `media` factor equal to what the crisis leaves, on each day of the crisis", () => {
    const state = crisisHotel();
    const crisis = activeCrisis(state);
    const first = demand(state, crisis.startDate);
    expect(first.factors.media).toBeCloseTo(1 - crisis.demandDrop, 10);
    expect(demand(state, crisis.endDate).factors.media).toBeCloseTo(1 - crisis.demandDrop, 10);
  });

  it("cuts the demand by the crisis's 30 to 50 %", () => {
    const state = crisisHotel();
    const crisis = activeCrisis(state);
    const calm = demand(hotel(), crisis.startDate);
    const troubled = demand(state, crisis.startDate);
    expect(troubled.multiplier / calm.multiplier).toBeCloseTo(1 - crisis.demandDrop, 6);
    expect(1 - troubled.multiplier / calm.multiplier).toBeGreaterThanOrEqual(0.3 - 1e-9);
    expect(1 - troubled.multiplier / calm.multiplier).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it("is over on the day after the crisis", () => {
    const state = crisisHotel();
    const { endDate } = activeCrisis(state);
    expect(demand(state, plus(endDate, 1)).factors).not.toHaveProperty("media");
  });

  it("a rehabilitation campaign lifts the demand above normal", () => {
    const state = respondToCrisis({ hotelState: crisisHotel() }, "audit", { date: plus(ONSET, 1), day: 10 }).hotelState;
    const boosted = demand(state, plus(ONSET, 1));
    expect(boosted.factors.media).toBeGreaterThan(1);
    expect(boosted.multiplier).toBeGreaterThan(demand(hotel(), plus(ONSET, 1)).multiplier);
  });

  it("fewer bookings come in during the crisis", () => {
    const state = crisisHotel();
    const date = D(activeCrisis(state).startDate);
    const sold = (hotelState) => applyDemand({ hotelState, rooms, reservations: [], referenceDate: date }).demandReport;
    expect(sold(state).multiplier).toBeLessThan(sold(hotel()).multiplier);
    expect(sold(state).factors.media).toBeLessThan(1);
  });

  it("the demand reading names the crisis as the cause", () => {
    const report = { multiplier: 0.55, factors: { reputation: 1, price: 1, season: 1, events: 1, incidents: 1, marketing: 1, media: 0.55 }, newBookings: 2, turnedAway: 0 };
    expect(describeDemand(report).headline).toContain("la crise médiatique");
  });

  it("and the rehabilitation as the reason for a strong demand", () => {
    const report = { multiplier: 1.15, factors: { reputation: 1, price: 1, season: 1, events: 1, incidents: 1, marketing: 1, media: 1.15 }, newBookings: 5, turnedAway: 0 };
    expect(describeDemand(report).headline).toContain("votre campagne de réhabilitation");
  });
});

describe("mediaCrisis / through the career day", () => {
  function career(extraHotel = {}) {
    return startCareer({
      playerId: "p",
      startDate: START,
      hotelState: { finance: { revenue: [100000], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {}, ...extraHotel },
      restaurantState: {
        finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
        menu: [{ price: 20, cost: 8, sales: 10 }],
        staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
        operations: [],
        marketing: { budget: 0 },
        esg: {},
      },
      rooms,
      reservations: [],
    });
  }
  const review = (id) => ({ id: `stay:${id}`, source: "stay", reservationId: id, day: 3, date: "2026-04-10", rating: 1, profile: "family", weight: 1, impact: -1.2, applied: -1.2, guestName: `Client ${id}`, roomNumber: "101", text: "Décevant." });
  const withBadReviews = (state) => ({ ...state, day: MIN_DAY + 1, hotel: { ...state.hotel, hotelState: { ...state.hotel.hotelState, guestReviews: [review(1), review(2), review(3)] } } });
  const dashboard = { kpis: { revenueToday: 0, profit: 0, satisfaction: 3, staffMorale: 50, occupancyRate: 0, date: "d" } };

  it("a hotel with no trigger has no crisis state (inert)", async () => {
    const { state } = await runCareerDay({ state: { ...career(), day: MIN_DAY + 1 }, rng: () => 0.999 });
    expect(state.hotel.hotelState.mediaCrisis).toBeUndefined();
  });

  it("three unanswered 1-star reviews break a crisis at the end of the day, and hold the reputation down", async () => {
    const { state } = await runCareerDay({ state: withBadReviews(career()), rng: () => 0.999 });
    const crisis = activeCrisis(state.hotel.hotelState);
    expect(crisis).toMatchObject({ cause: "reviews", status: "active" });
    const reputation = state.hotel.hotelState.progression.player.reputation;
    expect(reputation).toBeLessThanOrEqual(Math.max(0, crisis.baseReputation - crisis.peak));
    expect(crisis.baseReputation - reputation).toBeGreaterThanOrEqual(Math.min(crisis.peak, crisis.baseReputation) - 1);
  });

  it("the next day is played at a reduced demand", async () => {
    const first = await runCareerDay({ state: withBadReviews(career()), rng: () => 0.999 });
    const crisis = activeCrisis(first.state.hotel.hotelState);
    const second = await runCareerDay({ state: first.state, rng: () => 0.999 });
    expect(second.state.lastDayReport.demandReport.factors.media).toBeCloseTo(1 - crisis.demandDrop, 10);
  });

  it("the daily review tells the player about it", async () => {
    const { state } = await runCareerDay({ state: withBadReviews(career()), rng: () => 0.999 });
    const review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    expect(review.causalChain.join("\n")).toMatch(/Crise médiatique : .*chute de \d+ points/);
  });

  it("a crisis answered with a statement is charged to the treasury and ends sooner than left alone", async () => {
    const first = await runCareerDay({ state: withBadReviews(career()), rng: () => 0.999 });
    const date = iso(new Date(D(START).getTime() + first.state.day * DAY));
    const before = first.state.hotel.hotelState;
    const answered = respondToCrisis(first.state.hotel, "apology", { date, day: first.state.day });
    const costs = (hotelState) => hotelState.finance.costs.reduce((a, b) => a + b, 0);
    expect(costs(answered.hotelState) - costs(before)).toBe(APOLOGY_COST);
    expect(dayIndexOf(activeCrisis(answered.hotelState).endDate)).toBeLessThan(dayIndexOf(activeCrisis(before).endDate));
  });

  it("plays out to the end: the crisis closes, the history keeps it, demand returns", async () => {
    let state = withBadReviews(career());
    ({ state } = await runCareerDay({ state, rng: () => 0.999 }));
    const decided = respondToCrisis(state.hotel, "apology", { date: iso(new Date(D(START).getTime() + state.day * DAY)), day: state.day });
    state = { ...state, hotel: { ...state.hotel, ...decided } };
    let last;
    for (let i = 0; i < 12 && activeCrisis(state.hotel.hotelState); i += 1) {
      last = await runCareerDay({ state, rng: () => 0.999 });
      state = last.state;
    }
    expect(activeCrisis(state.hotel.hotelState)).toBeNull();
    expect(crisisHistory(state.hotel.hotelState)).toHaveLength(1);
    const after = await runCareerDay({ state, rng: () => 0.999 });
    expect(after.state.lastDayReport.demandReport.factors).not.toHaveProperty("media");
  });

  it("is deterministic", async () => {
    const run = () => runCareerDay({ state: withBadReviews(career()), rng: () => 0.999 });
    const [a, b] = await Promise.all([run(), run()]);
    expect(a.state.hotel.hotelState.mediaCrisis).toEqual(b.state.hotel.hotelState.mediaCrisis);
  });

  it("a hotel that answers its reviews breaks no crisis", async () => {
    const answered = Object.fromEntries(["stay:1", "stay:2", "stay:3"].map((id) => [id, { type: "courteous", day: 4, cost: 0 }]));
    const base = withBadReviews(career());
    const state = { ...base, hotel: { ...base.hotel, hotelState: { ...base.hotel.hotelState, reviewResponses: answered } } };
    const { state: next } = await runCareerDay({ state, rng: () => 0.999 });
    expect(next.hotel.hotelState.mediaCrisis).toBeUndefined();
  });
});
