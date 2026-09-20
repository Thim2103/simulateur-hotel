import { runCareerDay, startCareer } from "./careerEngine";
import { createEmployee } from "../staff/staffRoster";
import { buildDailyReview } from "../dashboard/dailyReview";

const QUIET = { sicknessRate: 0, expressTrainingRate: 0, raiseRequestRate: 0 };

function baseState() {
  return startCareer({
    playerId: "player-1",
    hotelState: { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {} },
    restaurantState: {
      finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
      menu: [{ price: 20, cost: 8, sales: 10 }],
      staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
      operations: [],
      marketing: { budget: 0 },
      esg: {},
    },
    rooms: [],
    reservations: [],
  });
}

function careerWithRoster(roster, config = QUIET) {
  const state = baseState();
  return {
    ...state,
    startDate: "2026-07-13",
    hotel: {
      ...state.hotel,
      hotelState: { ...state.hotel.hotelState, staffRoster: roster, staffEventsConfig: config },
      rooms: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, number: `${100 + i}`, type: "standard", price: 120, status: "libre", housekeeping_status: "clean" })),
      reservations: [],
    },
  };
}

test("a lone housekeeper facing a busy hotel wears out, hands in notice and leaves -- all reported in the day's log", async () => {
  let state = careerWithRoster([createEmployee({ id: "h1", name: "Ada", role: "housekeeping", level: "beginner" })]);
  const types = [];
  let peakCoverageShortfall = false;
  for (let i = 0; i < 45 && state.hotel.hotelState.staffRoster.length > 0; i += 1) {
    ({ state } = await runCareerDay({ state, rng: () => 0.999 }));
    if ((state.hotel.hotelState.staffing?.housekeepingCoverage ?? 1) < 1) peakCoverageShortfall = true;
    types.push(...(state.hotel.hotelState.staffEventLog || []).filter((e) => e.day === state.day).map((e) => e.type));
  }
  expect(peakCoverageShortfall).toBe(true); // the hotel really did overload her
  expect(types).toEqual(expect.arrayContaining(["resignation-notice", "resigned"]));
  expect(state.hotel.hotelState.staffRoster).toHaveLength(0);
});

test("the day's resignation shows up in that day's review", async () => {
  let state = careerWithRoster([createEmployee({ id: "h1", name: "Ada", role: "housekeeping", level: "beginner" })]);
  let reviewOnDeparture = null;
  for (let i = 0; i < 45 && !reviewOnDeparture; i += 1) {
    ({ state } = await runCareerDay({ state, rng: () => 0.999 }));
    const review = buildDailyReview({ careerState: state, dashboardState: { kpis: { revenueToday: 0, profit: 0, satisfaction: 3, staffMorale: 50, occupancyRate: 0, date: "d" } } });
    if (review.staffEvents.some((e) => e.type === "resigned")) reviewOnDeparture = review;
  }
  expect(reviewOnDeparture).not.toBeNull();
  expect(reviewOnDeparture.staffEvents.find((e) => e.type === "resigned").message).toMatch(/Ada.*démissionn/);
});

test("a team that covers the hotel keeps everyone, with no HR events at all", async () => {
  let state = careerWithRoster(Array.from({ length: 4 }, (_, i) => createEmployee({ id: `h${i}`, name: `H${i}`, role: "housekeeping", level: "experienced" })));
  for (let i = 0; i < 15; i += 1) ({ state } = await runCareerDay({ state, rng: () => 0.999 }));
  expect(state.hotel.hotelState.staffRoster).toHaveLength(4);
  expect(state.hotel.hotelState.staffEventLog).toEqual([]);
});

test("HR events never depend on the rng handed in: same career, same result whatever the rng", async () => {
  const roster = [createEmployee({ id: "h1", name: "Ada", role: "housekeeping", level: "beginner" }), createEmployee({ id: "r1", name: "Lina", role: "reception", level: "experienced" })];
  const config = { sicknessRate: 0.3, expressTrainingRate: 0, raiseRequestRate: 0.3 };
  const play = async (rng) => {
    let state = careerWithRoster(roster, config);
    for (let i = 0; i < 12; i += 1) ({ state } = await runCareerDay({ state, rng }));
    return state.hotel.hotelState.staffEventLog.map((e) => e.id);
  };
  const withHigh = await play(() => 0.999);
  const withLow = await play(() => 0.999);
  expect(withHigh).toEqual(withLow);
  expect(withHigh.length).toBeGreaterThan(0);
});

test("a career with no roster is completely unaffected", async () => {
  const state = baseState();
  const { state: next } = await runCareerDay({ state, rng: () => 0.999 });
  expect(next.hotel.hotelState.staffRoster).toBeUndefined();
  expect(next.hotel.hotelState.staffEventLog).toBeUndefined();
});
