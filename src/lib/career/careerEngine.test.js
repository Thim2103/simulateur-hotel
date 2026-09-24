import {
  acceptMission,
  careerReferenceDate,
  claimReward,
  completeMission,
  runCareerDay,
  runMiniScenarioChallenge,
  startCareer,
  triggerStoryEvent,
  updateSkillPoints,
} from "./careerEngine";
import { createScenarioTemplate } from "../scenario/scenarioSchema";
import { effectiveHotelFinance, rosterDailyPayroll, staffingSatisfactionPenalty, hireEmployee, createEmployee } from "../staff/staffRoster";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

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
    rooms: [{ id: 1, number: "101", status: "libre", housekeeping_status: "clean" }],
    reservations: [{ id: 1, room_id: 1, client_name: "Ada", status: "confirmée", arrival: "2026-09-10", departure: "2026-09-12" }],
  });
}

test("startCareer seeds missions and objectives and marks the career active", () => {
  const state = baseState();
  expect(state.status).toBe("active");
  expect(state.missions.length).toBeGreaterThan(0);
  expect(state.objectives.length).toBeGreaterThan(0);
});

test("runCareerDay advances the real hotel through runDailyCycle, sandboxed", async () => {
  const state = baseState();
  const { state: nextState, report } = await runCareerDay({ state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(nextState.day).toBe(1);
  expect(report.dailyReport.date).toBe("2026-09-10");
  expect(nextState.replayLog.entries).toHaveLength(1);
  expect(nextState.scoreHistory).toHaveLength(1);
});

test("runCareerDay auto-completes an accepted mission and grants its reward", async () => {
  let state = baseState();
  state = acceptMission(state, "occupancy-80");
  ({ state } = await runCareerDay({ state, referenceDate: REFERENCE_DATE, rng: () => 0.999 }));

  const mission = state.missions.find((m) => m.id === "occupancy-80");
  expect(mission.status).toBe("completed");
  expect(state.rewardsInbox.some((reward) => reward.rewardId === "cash-500")).toBe(true);
});

test("completeMission manually resolves a non-auto mission and grants its reward", () => {
  let state = baseState();
  state = acceptMission(state, "mini-scenario-pricing");
  const { state: nextState } = completeMission(state, "mini-scenario-pricing");

  expect(nextState.missions.find((m) => m.id === "mini-scenario-pricing").status).toBe("completed");
  expect(nextState.rewardsInbox.some((reward) => reward.rewardId === "cash-1000")).toBe(true);
});

test("triggerStoryEvent applies its consequence to the hotel and records history", () => {
  const state = baseState();
  const { state: nextState, consequence } = triggerStoryEvent(state, "staff-conflict", "mediate");

  expect(consequence).toEqual({ skillId: "leadership", skillPoints: 2 });
  expect(nextState.skills.leadership.points).toBe(2);
  expect(nextState.storyline.history).toHaveLength(1);
});

test("triggerStoryEvent with a cash consequence adjusts the hotel's revenue", () => {
  const state = baseState();
  const { state: nextState } = triggerStoryEvent(state, "first-week-review", "ask-budget");
  expect(nextState.hotel.hotelState.finance.revenue[0]).toBe(2000);
});

test("updateSkillPoints adds points directly", () => {
  const state = baseState();
  const nextState = updateSkillPoints(state, "management", 15);
  expect(nextState.skills.management).toEqual({ points: 15, level: 1 });
});

test("claimReward removes a reward from the inbox and applies its cash effect", () => {
  let state = baseState();
  state = acceptMission(state, "mini-scenario-pricing");
  ({ state } = completeMission(state, "mini-scenario-pricing"));
  const rewardEntryId = state.rewardsInbox[0].id;

  const { state: nextState } = claimReward(state, rewardEntryId);
  expect(nextState.rewardsInbox).toEqual([]);
  expect(nextState.hotel.hotelState.finance.revenue[0]).toBe(1000);
});

test("runMiniScenarioChallenge runs a sandboxed scenario cycle and clears itself once finished", async () => {
  const state = baseState();
  const scenario = createScenarioTemplate("solo", {
    objectives: [{ id: "profit", kpi: "profit", comparator: "gte", target: 0 }],
    duration: { unit: "days", value: 1 },
  });

  const { state: nextState, report } = await runMiniScenarioChallenge({ state, scenario, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  expect(report.baseReport).toBeDefined();
  expect(nextState.activeMiniScenario).toBeNull(); // finished after its one and only cycle
});

test("a full week of career days accumulates score history and progresses the storyline eligibility window", async () => {
  let state = baseState();
  for (let i = 0; i < 7; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    ({ state } = await runCareerDay({ state, referenceDate: REFERENCE_DATE, rng: () => 0.999 }));
  }
  expect(state.day).toBe(7);
  expect(state.scoreHistory).toHaveLength(7);
});

describe("career calendar", () => {
  test("startCareer records its start date, and career day N maps to startDate + N days", () => {
    const state = startCareer({ playerId: "p", startDate: new Date("2026-09-10T08:00:00Z") });
    expect(state.startDate).toBe("2026-09-10");
    expect(careerReferenceDate(state).toISOString().slice(0, 10)).toBe("2026-09-10");
    expect(careerReferenceDate({ ...state, day: 3 }).toISOString().slice(0, 10)).toBe("2026-09-13");
  });

  test("a career without a start date (saved before it existed) keeps using the real current date", () => {
    const before = Date.now();
    const date = careerReferenceDate({ day: 5 });
    expect(date.getTime()).toBeGreaterThanOrEqual(before);
  });

  test("consecutive days played without an explicit date advance one calendar day at a time", async () => {
    let state = { ...baseState(), startDate: "2026-09-10" };
    const dates = [];
    for (let i = 0; i < 3; i += 1) {
      const result = await runCareerDay({ state, rng: () => 0.999 });
      dates.push(result.report.dailyReport.date);
      state = result.state;
    }
    expect(dates).toEqual(["2026-09-10", "2026-09-11", "2026-09-12"]);
  });
});

describe("career demand model", () => {
  function pricedHotelState(overrides = {}) {
    const state = baseState();
    return {
      ...state,
      startDate: "2026-07-13",
      hotel: {
        ...state.hotel,
        rooms: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, number: `${100 + i}`, type: "standard", price: 120, status: "libre", housekeeping_status: "clean" })),
        reservations: [],
        hotelState: { ...state.hotel.hotelState, ...overrides },
      },
    };
  }

  async function playDays(state, days) {
    let current = state;
    let bookings = 0;
    let occupied = 0;
    for (let i = 0; i < days; i += 1) {
      const result = await runCareerDay({ state: current, rng: () => 0.999 });
      current = result.state;
      bookings += result.report.dailyReport.demandReport.newBookings;
      occupied += result.report.dailyReport.hotelRevenue.occupiedRooms;
    }
    return { state: current, bookings, occupied };
  }

  test("each day attaches a demand report and persists the demand state, and new bookings enter the reservation list", async () => {
    const { state, report } = await runCareerDay({ state: pricedHotelState(), rng: () => 0.999 });
    const demandReport = report.dailyReport.demandReport;
    expect(demandReport).toMatchObject({ date: "2026-07-13", multiplier: expect.any(Number), newBookings: expect.any(Number) });
    expect(state.lastDayReport.demandReport).toBe(demandReport);
    expect(state.hotel.hotelState.demand).toEqual({ carry: expect.any(Number), lastMultiplier: demandReport.multiplier });
    expect(state.hotel.reservations.length).toBe(demandReport.newBookings);
    expect(demandReport.newBookings).toBeGreaterThan(0);
  });

  test("a hotel that ignores its open incidents fills perceptibly less than one that repaired them", async () => {
    const incident = (id, status) => ({ id, zone: "laundry", severity: "critical", status, createdOnDay: 0, daysOpen: 5 });
    const neglected = await playDays(pricedHotelState({ activeIncidents: [incident("a", "active"), incident("b", "active")] }), 14);
    const repaired = await playDays(pricedHotelState({ activeIncidents: [incident("a", "resolved"), incident("b", "resolved")] }), 14);

    expect(neglected.bookings).toBeLessThan(repaired.bookings);
    expect(neglected.occupied).toBeLessThan(repaired.occupied);
  });

  test("occupancy actually builds up over the first days as bookings arrive, then holds", async () => {
    const day1 = await playDays(pricedHotelState(), 1);
    const twoWeeks = await playDays(pricedHotelState(), 14);
    expect(twoWeeks.occupied / 14).toBeGreaterThan(day1.occupied);
  });
});

test("a legacy career (no start date) is dated from its next played day, keeping that day's date and advancing one day at a time", async () => {
  const legacy = { ...baseState(), startDate: null, day: 4 };
  const first = await runCareerDay({ state: legacy, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  expect(first.state.startDate).toBe("2026-09-06"); // 2026-09-10 minus 4 days
  expect(careerReferenceDate(first.state).toISOString().slice(0, 10)).toBe("2026-09-11");
});

describe("career staff roster", () => {
  function bigPayrollCareer() {
    const state = baseState();
    return {
      ...state,
      startDate: "2026-07-13",
      hotel: {
        ...state.hotel,
        hotelState: { ...state.hotel.hotelState, finance: { ...state.hotel.hotelState.finance, payroll: 38000 } },
        rooms: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, number: `${100 + i}`, type: "standard", price: 120, status: "libre", housekeeping_status: "clean" })),
        reservations: [],
      },
    };
  }

  test("a new career whose payroll can absorb it starts with a small team at no extra cost", () => {
    const started = startCareer({ playerId: "p", hotelState: { finance: { payroll: 38000 } } });
    const hotelState = started.hotel.hotelState;
    expect(hotelState.staffRoster.length).toBeGreaterThan(0);
    expect(effectiveHotelFinance(hotelState).payroll).toBe(38000);
  });

  test("a career with too small a payroll starts without a roster, exactly as before", () => {
    expect(baseState().hotel.hotelState.staffRoster).toBeUndefined();
  });

  test("playing a day records the staffing snapshot and wears the roster", async () => {
    const state = startCareer({ playerId: "p", startDate: "2026-07-13", hotelState: bigPayrollCareer().hotel.hotelState, restaurantState: baseState().hotel.restaurantState, rooms: bigPayrollCareer().hotel.rooms, reservations: [] });
    const { state: next } = await runCareerDay({ state, rng: () => 0.999 });
    expect(next.hotel.hotelState.staffing).toMatchObject({ day: 1, occupiedRooms: expect.any(Number), housekeepingCoverage: expect.any(Number) });
    expect(next.hotel.hotelState.staffRoster).toHaveLength(state.hotel.hotelState.staffRoster.length);
  });

  test("the roster's payroll is charged on top of the base payroll in the day's expenses", async () => {
    const base = bigPayrollCareer();
    const plain = await runCareerDay({ state: base, rng: () => 0.999 });
    const roster = [createEmployee({ id: "a", name: "A", role: "housekeeping", level: "experienced" }), createEmployee({ id: "b", name: "B", role: "maintenance", level: "expert" })];
    const withRoster = await runCareerDay({ state: { ...base, hotel: { ...base.hotel, hotelState: { ...base.hotel.hotelState, staffRoster: roster } } }, rng: () => 0.999 });
    expect(withRoster.report.dailyReport.expenses.total - plain.report.dailyReport.expenses.total).toBe(rosterDailyPayroll({ staffRoster: roster }));
  });

  test("a hotel with no housekeepers falls short of coverage once guests arrive, which costs guest satisfaction", async () => {
    const base = bigPayrollCareer();
    let state = { ...base, hotel: { ...base.hotel, hotelState: { ...base.hotel.hotelState, staffRoster: [] } } };
    for (let i = 0; i < 6; i += 1) ({ state } = await runCareerDay({ state, rng: () => 0.999 }));
    const staffing = state.hotel.hotelState.staffing;
    expect(staffing.occupiedRooms).toBeGreaterThan(0);
    expect(staffing.housekeepingCoverage).toBe(0);
    expect(staffing.cleaningDelayFactor).toBe(2.5);
    expect(staffingSatisfactionPenalty(state.hotel.hotelState)).toBeGreaterThan(0);
  });

  test("hiring housekeepers removes the shortage", async () => {
    const base = bigPayrollCareer();
    let state = { ...base, hotel: { ...base.hotel, hotelState: { ...base.hotel.hotelState, staffRoster: [] } } };
    for (let i = 0; i < 3; i += 1) {
      state = { ...state, hotel: hireEmployee(state.hotel, { role: "housekeeping", level: "experienced", day: 0 }) };
    }
    for (let i = 0; i < 6; i += 1) ({ state } = await runCareerDay({ state, rng: () => 0.999 }));
    expect(state.hotel.hotelState.staffing.housekeepingCoverage).toBeGreaterThanOrEqual(1);
    expect(state.hotel.hotelState.staffing.cleaningDelayFactor).toBe(1);
  });
});
