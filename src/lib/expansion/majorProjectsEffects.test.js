import { computeDemand } from "../demand/demandEngine";
import { computeDailyMaintenance } from "../maintenance/maintenanceCostEngine";
import { reviewsForDepartures } from "../clients/guestReviewEngine";
import { vipSatisfaction } from "../clients/vipServiceEngine";
import { runClientsCycle } from "../clients/clientsEngine";
import { calculateReputation } from "../progression/reputation";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildDailyReview } from "../dashboard/dailyReview";
import { loanOptions, starsOf, creditScore } from "../banking/bankingLoanEngine";
import { treasuryOf } from "../finance/investmentFunding";
import { startProject, advanceMajorProjects, isBuilt, builtProjects, PROJECTS, WING_SIZES, ECO_UPKEEP_FACTOR, ECO_RATING_BONUS, SPA_VIP_SATISFACTION, SPA_DEMAND_FACTOR } from "./majorProjectsEngine";

const APR = new Date("2026-04-15T12:00:00Z");
const rooms = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, number: String(100 + i), type: "standard", price: 120, status: "libre", capacity: 2, housekeeping_status: "clean" }));
const base = (extra = {}) => ({ finance: { revenue: [500000], costs: [0] }, structure: { starRating: 3 }, progression: { player: { reputation: 60 } }, ...extra });
const built = (ids, extra = {}) => ({ ...base(extra), majorProjects: { built: Object.fromEntries(ids.map((id) => [id, { day: 1 }])), works: {}, log: [] } });

describe("majorProjects / the upkeep bill", () => {
  it("falls by 20 % with the ecological renovation", () => {
    const plain = computeDailyMaintenance({ hotelState: base(), rooms });
    const green = computeDailyMaintenance({ hotelState: built(["eco"]), rooms });
    expect(plain.total).toBe(100); // 20 standard rooms at 5 EUR
    expect(green.total).toBe(Math.round(100 * ECO_UPKEEP_FACTOR));
    expect(green.total / plain.total).toBeCloseTo(0.8, 5);
  });

  it("every part of the bill falls with it", () => {
    const green = computeDailyMaintenance({ hotelState: built(["eco"], { buildingExpansion: { floors: { 5: { status: "built" } } } }), rooms });
    const plain = computeDailyMaintenance({ hotelState: base({ buildingExpansion: { floors: { 5: { status: "built" } } } }), rooms });
    expect(green.rooms).toBeLessThan(plain.rooms);
    expect(green.floors).toBeLessThan(plain.floors);
    expect(green.total).toBe(green.rooms + green.equipment + green.floors);
  });

  it("the other projects do not change it", () => {
    expect(computeDailyMaintenance({ hotelState: built(["spa", "wing"]), rooms }).total).toBe(computeDailyMaintenance({ hotelState: base(), rooms }).total);
  });

  it("a hotel with no project pays what it always paid", () => {
    const plain = computeDailyMaintenance({ hotelState: base(), rooms });
    expect(plain.multiplier).toBe(1);
  });
});

describe("majorProjects / demand", () => {
  const demand = (hotelState) => computeDemand({ hotelState, rooms, reservations: [], referenceDate: APR });

  it("adds no factor without a spa (still six)", () => {
    expect(Object.keys(demand(base()).factors).sort()).toEqual(["events", "incidents", "marketing", "price", "reputation", "season"]);
    expect(demand(built(["eco", "wing"])).factors).not.toHaveProperty("spa");
  });

  it("the spa lists an attractiveness factor of +6 %", () => {
    expect(demand(built(["spa"])).factors.spa).toBe(SPA_DEMAND_FACTOR);
  });

  it("and lifts the demand by that factor, all else being equal", () => {
    expect(demand(built(["spa"])).multiplier / demand(base()).multiplier).toBeCloseTo(SPA_DEMAND_FACTOR, 8);
  });
});

describe("majorProjects / the guests' opinion", () => {
  const stayAt = (id) => ({ id, room_id: 1, room: "101", room_type: "standard", client_name: `Client ${id}`, arrival: "2027-01-13", departure: "2027-01-15", status: "confirmée", segment: "leisure", price: 120 });
  const ratings = (hotelState) => {
    const found = new Map();
    for (let block = 0; block < 80; block += 1) {
      const reservations = Array.from({ length: 25 }, (_, i) => stayAt(block * 25 + i + 1));
      reviewsForDepartures({ hotelState, reservations, rooms, date: "2027-01-15", day: 5 }).forEach((review) => found.set(review.id, review.rating));
    }
    return found;
  };

  it("guests rate an eco-friendly hotel higher, never lower", () => {
    const plain = ratings(base());
    const green = ratings(built(["eco"]));
    expect(plain.size).toBeGreaterThan(30);
    let higher = 0;
    green.forEach((rating, id) => {
      expect(rating).toBeGreaterThanOrEqual(plain.get(id));
      if (rating > plain.get(id)) higher += 1;
    });
    expect(higher).toBeGreaterThan(0);
    expect(higher / green.size).toBeLessThan(0.4);
    expect(ECO_RATING_BONUS).toBe(0.15);
  });

  it("a V.I.P.'s gauge shows a line for the spa, +6 points", () => {
    const stay = stayAt(1);
    const plain = vipSatisfaction({ reservation: stay, hotelState: base() });
    const spa = vipSatisfaction({ reservation: stay, hotelState: built(["spa"]) });
    expect(spa.lines.find((line) => line.key === "spa")).toMatchObject({ label: "Espace bien-être", value: SPA_VIP_SATISFACTION });
    expect(plain.lines.find((line) => line.key === "spa")).toBeUndefined();
    expect(spa.score - plain.score).toBe(6);
  });

  it("the reputation drifts towards a higher target with the renovation", () => {
    const reputation = (hotelState) => calculateReputation({ hotelState, restaurantState: { staff: [{ satisfaction: 70 }] }, previousReputation: 20 });
    expect(reputation(built(["eco"]))).toBeGreaterThan(reputation(base()));
  });

  it("the noise of the wing's works dents the guests' satisfaction, and only while it lasts", () => {
    const satisfaction = (hotelState) => runClientsCycle({ hotelBundle: { hotelState, restaurantState: {}, rooms: [{ id: "r1", type: "Standard" }], reservations: [{ id: "res1", status: "occupied" }] } }).satisfaction;
    const works = { ...base(), majorProjects: { built: {}, works: { wing: { startedOnDay: 1, completesOnDay: 6, size: 10 } }, log: [] } };
    expect(satisfaction(works)).toBeLessThan(satisfaction(base()));
    expect(satisfaction(built(["wing"]))).toBe(satisfaction(base()));
  });
});

describe("majorProjects / the bank reads the stars", () => {
  const option = (hotelState) => loanOptions(hotelState).find((item) => item.type === "bond");

  it("a 3-star hotel cannot issue a bond, a 4-star one can", () => {
    expect(starsOf(base())).toBe(3);
    expect(option(base())).toMatchObject({ available: false, reason: "Réservé aux hôtels 4★ et plus" });
    expect(creditScore(base())).toBeGreaterThanOrEqual(70);
    expect(starsOf(built(["eco", "spa"]))).toBe(4);
    expect(option(built(["eco", "spa"])).available).toBe(true);
  });

  it("one project is half a star: not enough", () => {
    expect(starsOf(built(["spa"]))).toBe(3);
    expect(option(built(["spa"])).available).toBe(false);
  });

  it("a hotel that already has its stars keeps them", () => {
    expect(starsOf({ structure: { starRating: 5 } })).toBe(5);
  });
});

describe("majorProjects / through the career day", () => {
  const career = (hotelExtra = {}) =>
    startCareer({
      playerId: "p",
      startDate: "2026-04-06",
      hotelState: { finance: { revenue: [900000], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {}, structure: { starRating: 3 }, ...hotelExtra },
      restaurantState: {
        finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
        menu: [{ price: 20, cost: 8, sales: 10 }],
        staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
        operations: [],
        marketing: { budget: 0 },
        esg: {},
      },
      rooms: rooms.slice(0, 6),
      reservations: [],
    });
  const begin = (state, id, options) => ({ ...state, hotel: { ...state.hotel, ...startProject(state.hotel, id, { day: state.day, ...options }) } });
  const play = async (state, days) => {
    let current = state;
    for (let i = 0; i < days; i += 1) ({ state: current } = await runCareerDay({ state: current, rng: () => 0.999 }));
    return current;
  };
  const dashboard = { kpis: { revenueToday: 0, profit: 0, satisfaction: 3, staffMorale: 50, occupancyRate: 0, date: "d" } };

  it("a hotel with no project has no project state after a day", async () => {
    const state = await play(career(), 1);
    expect(state.hotel.hotelState.majorProjects).toBeUndefined();
    expect(state.hotel.rooms).toHaveLength(6);
  });

  it("the works are paid at once and go on in real time, day after day", async () => {
    const started = begin(career(), "eco");
    expect(treasuryOf(started.hotel.hotelState)).toBe(900000 - 50000);
    const mid = await play(started, 2);
    expect(isBuilt(mid.hotel.hotelState, "eco")).toBe(false);
    expect(buildReview(mid).causalChain.join("\n")).toMatch(/Chantier en cours : Rénovation écologique & rooftop RSE, \d+ jours? de travaux restants?/);
    const done = await play(mid, 2);
    expect(isBuilt(done.hotel.hotelState, "eco")).toBe(true);
  });

  const buildReview = (state) => buildDailyReview({ careerState: state, dashboardState: dashboard });

  it("the wing adds its rooms to the hotel when it opens, and the review says so", async () => {
    let state = begin(career(), "wing", { size: 10 });
    let review;
    for (let i = 0; i < PROJECTS.wing.days + 2 && !isBuilt(state.hotel.hotelState, "wing"); i += 1) state = await play(state, 1);
    expect(isBuilt(state.hotel.hotelState, "wing")).toBe(true);
    expect(state.hotel.rooms).toHaveLength(16);
    expect(state.hotel.rooms.filter((room) => room.metadata?.wing)).toHaveLength(10);
    review = buildReview(state);
    expect(review.causalChain.join("\n")).toMatch(/Chantier terminé : Nouvelle aile de chambres — 10 chambres livrées/);
  });

  it("the new rooms are sold and cleaned like any other", async () => {
    let state = begin(career(), "wing", { size: 10 });
    state = await play(state, PROJECTS.wing.days);
    state = await play(state, 3);
    const wingIds = new Set(state.hotel.rooms.filter((room) => room.metadata?.wing).map((room) => room.id));
    expect(wingIds.size).toBe(10);
    // The upkeep bill counts them.
    expect(computeDailyMaintenance({ hotelState: state.hotel.hotelState, rooms: state.hotel.rooms }).total).toBeGreaterThan(computeDailyMaintenance({ hotelState: state.hotel.hotelState, rooms: rooms.slice(0, 6) }).total);
  });

  it("the renovation lowers the upkeep bill the day it is delivered", async () => {
    const plain = await play(career(), 6);
    const green = await play(begin(career(), "eco"), 6);
    expect(green.lastDayReport.expenses.maintenance.total).toBeLessThan(plain.lastDayReport.expenses.maintenance.total);
  });

  it("the spa raises the room rates when it opens", async () => {
    const state = await play(begin(career(), "spa"), PROJECTS.spa.days + 1);
    expect(isBuilt(state.hotel.hotelState, "spa")).toBe(true);
    state.hotel.rooms.slice(0, 6).forEach((room) => expect(room.price).toBe(138));
  });

  it("the hotel gains its stars as projects are delivered", async () => {
    let state = begin(career(), "eco");
    state = await play(state, 4);
    state = begin(state, "spa");
    state = await play(state, PROJECTS.spa.days + 1);
    expect(builtProjects(state.hotel.hotelState).sort()).toEqual(["eco", "spa"]);
    expect(starsOf(state.hotel.hotelState)).toBe(4);
  }, 60000);

  it("is deterministic", async () => {
    const run = () => play(begin(career(), "wing", { size: 15 }), PROJECTS.wing.days + 1);
    const [a, b] = await Promise.all([run(), run()]);
    expect(a.hotel.rooms).toEqual(b.hotel.rooms);
    expect(a.hotel.hotelState.majorProjects).toEqual(b.hotel.hotelState.majorProjects);
  });

  it("can be paid for with a bank loan", async () => {
    const poor = career({ finance: { revenue: [1000], costs: [0], months: {}, fixedCosts: 0, payroll: 0 } });
    expect(startProject(poor.hotel, "eco", { day: 0 })).toBe(poor.hotel);
    const lent = { ...poor, hotel: { ...poor.hotel, hotelState: { ...poor.hotel.hotelState, banking: { cashAdjustment: 60000 } } } };
    expect(startProject(lent.hotel, "eco", { day: 0 }).hotelState.majorProjects.works.eco).toBeTruthy();
  });

  it("the wing's sizes, all told", () => {
    expect(WING_SIZES).toHaveLength(3);
    expect(advanceMajorProjects({ hotelState: {}, rooms: [] }, { day: 1 }).rooms).toEqual([]);
  });
});
