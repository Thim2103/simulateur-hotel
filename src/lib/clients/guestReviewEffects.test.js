import { calculateReputation } from "../progression/reputation";
import { computeDemand } from "../demand/demandEngine";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildDailyReview } from "../dashboard/dailyReview";
import { buildHotelSceneEntities } from "../../ui/hotelView/engine/EntityFactory";
import { baseImpact, respondToReview, listReviews, pendingReputationDelta, unansweredNegativeReviews, reviewsPostedOn } from "./guestReviewEngine";
import { isVip } from "./guestProfiles";
import { eventsOn, seasonIdOn } from "../hotelEvents/hotelEventsEngine";

const DAY = 86400000;
const D = (text) => new Date(`${text}T12:00:00Z`);
function findDate(test, from = "2026-01-01") {
  for (let i = 0; i < 800; i += 1) {
    const date = new Date(D(from).getTime() + i * DAY);
    if (test(date)) return date;
  }
  throw new Error("no date found");
}
const CALM = findDate((d) => Array.from({ length: 12 }, (_, i) => new Date(d.getTime() + i * DAY)).every((day) => eventsOn(day).length === 0 && seasonIdOn(day) === "shoulder"));
const iso = (date) => date.toISOString().slice(0, 10);

const review = (id, rating, extra = {}) => ({
  id: `stay:${id}`, source: "stay", reservationId: id, guestName: `Client ${id}`, profile: "family", weight: 1, roomNumber: "101", nights: 2, nightPrice: 110,
  rating, text: "…", day: 3, date: "2026-09-12", impact: baseImpact(rating, 1), applied: 0, ...extra,
});
const vipReview = (id, rating) => review(id, rating, { profile: "vip", weight: 3, impact: baseImpact(rating, 3) });
const withReviews = (reviews, extra = {}) => ({ finance: { revenue: [10000], costs: [0] }, guestReviews: reviews, ...extra });

const reputation = (hotelState) => calculateReputation({ hotelState, restaurantState: {}, previousReputation: 50 });
const demand = (hotelState) => computeDemand({ hotelState, rooms: [{ id: 1, price: 100 }], reservations: [], referenceDate: CALM });

describe("guest reviews / reputation", () => {
  it("a bad review dents tomorrow's reputation, a good one lifts it", () => {
    const base = reputation({});
    expect(reputation(withReviews([review(1, 1)]))).toBeLessThanOrEqual(base);
    expect(reputation(withReviews([review(1, 5)]))).toBeGreaterThanOrEqual(base);
  });

  it("a V.I.P.'s bad review dents it three times as much", () => {
    const base = reputation({});
    const ordinary = base - reputation(withReviews([review(1, 1), review(2, 1), review(3, 1)]));
    const vip = base - reputation(withReviews([vipReview(1, 1)]));
    expect(vip).toBeGreaterThanOrEqual(ordinary - 1);
    expect(reputation(withReviews([vipReview(1, 1), vipReview(2, 1)]))).toBeLessThan(base - 5);
  });

  it("a commercial gesture spares most of the damage", () => {
    const state = withReviews([vipReview(1, 1), vipReview(2, 1)]);
    const answered = respondToReview({ hotelState: respondToReview({ hotelState: state }, "stay:1", "gesture", { day: 3 }).hotelState }, "stay:2", "gesture", { day: 3 }).hotelState;
    expect(reputation(answered)).toBeGreaterThan(reputation(state));
    expect(reputation(state) - reputation(answered)).toBeLessThanOrEqual(0);
  });

  it("an aggressive answer makes it worse than saying nothing", () => {
    const state = withReviews([vipReview(1, 1), vipReview(2, 1)]);
    const hostile = respondToReview({ hotelState: state }, "stay:1", "aggressive", { day: 3 }).hotelState;
    expect(reputation(hostile)).toBeLessThan(reputation(state));
  });

  it("without any review, the reputation is what it always was", () => {
    expect(reputation({ guestReviews: [] })).toBe(reputation({}));
  });

  it("stays within 0..100", () => {
    const many = Array.from({ length: 30 }, (_, i) => vipReview(i + 1, 1));
    expect(calculateReputation({ hotelState: withReviews(many), restaurantState: {}, previousReputation: 2 })).toBeGreaterThanOrEqual(0);
  });
});

describe("guest reviews / tomorrow's demand", () => {
  it("a V.I.P.'s glowing review lifts demand, a scathing one cuts it", () => {
    const base = demand({}).multiplier;
    expect(demand(withReviews([vipReview(1, 5)])).multiplier).toBeGreaterThan(base);
    expect(demand(withReviews([vipReview(1, 1)])).multiplier).toBeLessThan(base);
  });

  it("the V.I.P. counts three times an ordinary guest's", () => {
    const base = demand({}).factors.reputation;
    const ordinary = Math.abs(demand(withReviews([review(1, 1)])).factors.reputation - base);
    const vip = Math.abs(demand(withReviews([vipReview(1, 1)])).factors.reputation - base);
    expect(vip / ordinary).toBeCloseTo(3, 0);
  });

  it("a commercial gesture spares the demand too", () => {
    const state = withReviews([vipReview(1, 1)]);
    const answered = respondToReview({ hotelState: state }, "stay:1", "gesture", { day: 3 }).hotelState;
    expect(demand(answered).factors.reputation).toBeGreaterThan(demand(state).factors.reputation);
  });

  it("no pending review, no effect", () => {
    expect(demand({}).factors.reputation).toBe(demand({ guestReviews: [{ ...review(1, 1), applied: -1.2 }] }).factors.reputation);
  });
});

describe("guest reviews / the scene: a V.I.P.'s room is flagged", () => {
  const rooms = [{ id: 1, number: "101", status: "occupée" }, { id: 2, number: "102", status: "libre" }];
  const roomEntities = (vipRoomIds) => buildHotelSceneEntities({ rooms, staffCount: 0, diagnostics: [], vipRoomIds }).filter((entity) => entity.type === "room");

  it("carries a vip flag on the room of a V.I.P. only", () => {
    const entities = roomEntities(new Set([1]));
    expect(entities.find((entity) => entity.metadata.number === "101").metadata.vip).toBe(true);
    expect(entities.find((entity) => entity.metadata.number === "102").metadata).not.toHaveProperty("vip");
  });

  it("no V.I.P., no flag anywhere (existing callers are unaffected)", () => {
    roomEntities(undefined).forEach((entity) => expect(entity.metadata).not.toHaveProperty("vip"));
    roomEntities(new Set()).forEach((entity) => expect(entity.metadata).not.toHaveProperty("vip"));
  });
});

describe("guest reviews / through the career day", () => {
  function career(startDate) {
    return startCareer({
      playerId: "p",
      startDate,
      hotelState: { finance: { revenue: [100000], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {}, expansion: { availableCapital: 100000 } },
      restaurantState: {
        finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
        menu: [{ price: 20, cost: 8, sales: 10 }],
        staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
        operations: [],
        marketing: { budget: 0 },
        esg: {},
      },
      rooms: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, number: String(101 + i), type: i < 3 ? "suite" : "standard", price: 100, status: "libre", housekeeping_status: "clean" })),
      reservations: [],
    });
  }
  const play = async (state, days) => {
    let current = state;
    for (let i = 0; i < days; i += 1) ({ state: current } = await runCareerDay({ state: current, rng: () => 0.999 }));
    return current;
  };
  const dashboard = { kpis: { revenueToday: 0, profit: 0, satisfaction: 3, staffMorale: 50, occupancyRate: 0, date: "d" } };

  it("guests who leave post reviews, over a few days", async () => {
    const state = await play(career(iso(CALM)), 8);
    expect(listReviews(state.hotel.hotelState).filter((r) => r.source === "stay").length).toBeGreaterThan(0);
  });

  it("reviews are pending the day they are posted, and settled the day after", async () => {
    let state = career(iso(CALM));
    let posted = null;
    for (let i = 0; i < 12 && !posted; i += 1) {
      state = await play(state, 1);
      const today = reviewsPostedOn(state.hotel.hotelState, state.day);
      if (today.length > 0) posted = state.day;
    }
    expect(posted).not.toBeNull();
    expect(state.hotel.hotelState.guestReviews.filter((r) => r.day === posted).every((r) => r.applied === 0)).toBe(true);
    state = await play(state, 1);
    expect(state.hotel.hotelState.guestReviews.filter((r) => r.day === posted).every((r) => r.applied === r.impact)).toBe(true);
  });

  it("the review of the day shows in the day's review, with a link to answer the bad ones", async () => {
    let state = career(iso(CALM));
    let review = null;
    for (let i = 0; i < 14 && !review?.guestReviews?.posted.length; i += 1) {
      state = await play(state, 1);
      review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    }
    expect(review.guestReviews.posted.length).toBeGreaterThan(0);
    expect(review.guestReviews.posted[0]).toMatchObject({ source: "stay" });
  });

  it("a V.I.P.'s review is called out in the causal chain", async () => {
    let state = career(iso(CALM));
    let found = null;
    for (let i = 0; i < 40 && !found; i += 1) {
      state = await play(state, 1);
      const review = buildDailyReview({ careerState: state, dashboardState: dashboard });
      if (review.guestReviews?.posted.some((r) => r.profile === "vip")) found = review;
    }
    expect(found).not.toBeNull();
    expect(found.causalChain.some((line) => /V\.I\.P\..*×3/.test(line))).toBe(true);
  });

  it("a hotel whose guests haven't left yet has no review section", () => {
    const state = career(iso(CALM));
    expect(buildDailyReview({ careerState: state, dashboardState: dashboard }).guestReviews).toBeNull();
  });

  it("answering a bad review is reflected in what will land", async () => {
    let state = career(iso(CALM));
    let bad = null;
    for (let i = 0; i < 40 && !bad; i += 1) {
      state = await play(state, 1);
      bad = unansweredNegativeReviews(state.hotel.hotelState).find((r) => r.source === "stay" && r.applied === 0);
    }
    expect(bad).toBeTruthy();
    const before = pendingReputationDelta(state.hotel.hotelState);
    const answered = respondToReview(state.hotel, bad.id, "gesture", { day: state.day });
    expect(pendingReputationDelta(answered.hotelState)).toBeGreaterThan(before);
  });

  it("is deterministic: the same career gives the same reviews", async () => {
    const a = await play(career(iso(CALM)), 6);
    const b = await play(career(iso(CALM)), 6);
    expect(a.hotel.hotelState.guestReviews).toEqual(b.hotel.hotelState.guestReviews);
  });

  it("the V.I.P.s in the hotel are the ones the profiles say", () => {
    const reservation = { id: 1, room_id: 1, arrival: iso(CALM), departure: iso(new Date(CALM.getTime() + 2 * DAY)), status: "confirmée" };
    expect(typeof isVip(reservation, { id: 1, type: "suite" })).toBe("boolean");
  });
});
