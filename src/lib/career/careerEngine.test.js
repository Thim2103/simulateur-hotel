import {
  acceptMission,
  claimReward,
  completeMission,
  runCareerDay,
  runMiniScenarioChallenge,
  startCareer,
  triggerStoryEvent,
  updateSkillPoints,
} from "./careerEngine";
import { createScenarioTemplate } from "../scenario/scenarioSchema";

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
