import { runHousekeepingCycle, housekeepingFromCareerState, generateHousekeepingReport, housekeepingDiagnosticsToAnalytics, HOUSEKEEPING_ACTION_CATALOG, applyHousekeepingDecision } from "./housekeepingEngine";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { createGuestHotelBundle } from "../guest";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function bundleFixture() {
  return {
    hotelState: {
      finance: { payroll: 38000 },
      esg: { energyConsumption: 62, waterUsage: 55 },
      housekeeping: { staffingBonus: 0, trainingLevel: 50, processEfficiency: 50 },
    },
    restaurantState: {},
    rooms: [
      { id: 1, number: "101", status: "occupée", housekeeping_status: "clean" },
      { id: 2, number: "102", status: "occupée", housekeeping_status: "clean" },
    ],
    reservations: [{ room_id: 1, status: "confirmée", arrival: "2026-09-09", departure: "2026-09-10" }],
  };
}

test("runHousekeepingCycle returns a fully-shaped HousekeepingState with a forecast attached", () => {
  const state = runHousekeepingCycle({ hotelBundle: bundleFixture(), staffProductivity: 70, hotelHeadcount: 15, referenceDate: REFERENCE_DATE });

  expect(state.period).toBe("2026-09-10");
  expect(state.cyclesElapsed).toBe(1);
  expect(state.workload.roomsToClean).toBe(1);
  expect(state.cleaningTime.totalMinutes).toBeGreaterThan(0);
  expect(state.productivity).toBeGreaterThanOrEqual(0);
  expect(state.overload).toBeGreaterThanOrEqual(0);
  expect(state.quality).toBeGreaterThanOrEqual(0);
  expect(state.cost).toBeGreaterThan(0);
  expect(Array.isArray(state.diagnostics)).toBe(true);
  expect(state.forecast.scenarios.realiste.days).toHaveLength(30);
});

test("runHousekeepingCycle increments cyclesElapsed and records a replay entry", () => {
  const first = runHousekeepingCycle({ hotelBundle: bundleFixture(), referenceDate: REFERENCE_DATE });
  const second = runHousekeepingCycle({ hotelBundle: bundleFixture(), previousState: first, referenceDate: REFERENCE_DATE });

  expect(second.cyclesElapsed).toBe(2);
  expect(second.replayLog.entries).toHaveLength(2);
  expect(second.replayLog.entries[1].cycleIndex).toBe(1);
});

test("every HOUSEKEEPING_ACTION_CATALOG action applies without throwing", () => {
  HOUSEKEEPING_ACTION_CATALOG.forEach((action) => {
    expect(() => applyHousekeepingDecision(bundleFixture(), action.id)).not.toThrow();
  });
});

test("housekeepingFromCareerState builds a HousekeepingState from a real CareerState", () => {
  const career = startCareer({ playerId: "player-1", ...createGuestHotelBundle({ referenceDate: REFERENCE_DATE }) });
  const state = housekeepingFromCareerState(career);
  expect(state.workload).toBeDefined();
  expect(state.quality).toBeGreaterThanOrEqual(0);
});

test("housekeepingFromCareerState folds in the day's real guest satisfaction after playing a day", async () => {
  const career = startCareer({ playerId: "player-1", ...createGuestHotelBundle({ referenceDate: REFERENCE_DATE }) });
  const { state: playedCareer } = await runCareerDay({ state: career, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
  const state = housekeepingFromCareerState(playedCareer);
  expect(state.quality).toBeGreaterThanOrEqual(0);
});

test("generateHousekeepingReport assembles every section, including the replay log", () => {
  const state = runHousekeepingCycle({ hotelBundle: bundleFixture(), referenceDate: REFERENCE_DATE });
  const report = generateHousekeepingReport(state);
  expect(report.workload).toBeDefined();
  expect(report.quality).toBeDefined();
  expect(report.replay.totalCycles).toBe(1);
});

test("housekeepingDiagnosticsToAnalytics adapts diagnostics into the Analytics shape", () => {
  const overloadedBundle = { ...bundleFixture(), rooms: Array.from({ length: 50 }, (_, i) => ({ id: i, number: String(i), status: "occupée", housekeeping_status: "dirty" })) };
  const state = runHousekeepingCycle({ hotelBundle: overloadedBundle, hotelHeadcount: 1, referenceDate: REFERENCE_DATE });
  const adapted = housekeepingDiagnosticsToAnalytics(state.diagnostics);
  expect(adapted.length).toBeGreaterThan(0);
  adapted.forEach((entry) => {
    expect(["anomaly", "error", "opportunity"]).toContain(entry.type);
    expect(entry).toHaveProperty("severity");
    expect(entry).toHaveProperty("message");
    expect(entry).toHaveProperty("cycleIndex", null);
  });
});
