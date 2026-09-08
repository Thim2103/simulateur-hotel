import { runStaffCycle, staffFromCareerState, generateStaffReport, staffDiagnosticsToAnalytics, STAFF_ACTION_CATALOG, applyStaffDecision } from "./staffEngine";
import { startCareer } from "../career/careerEngine";
import { createGuestHotelBundle } from "../guest";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function bundleFixture() {
  return {
    hotelState: { finance: { payroll: 38000 }, esg: { sustainabilityScore: 58 } },
    restaurantState: {
      staff: [
        { id: 1, name: "A", salary: 2000, productivity: 60, satisfaction: 60 },
        { id: 2, name: "B", salary: 3000, productivity: 80, satisfaction: 70 },
      ],
      finance: { payroll: 9800, fixedCosts: 6200 },
      esg: { staffWellbeing: 70, monthlyInvestment: 900 },
      structure: { seats: 40, capacity: 40 },
    },
    rooms: Array.from({ length: 20 }, (_, i) => ({ id: i })),
    reservations: [],
  };
}

test("runStaffCycle returns a fully-shaped StaffState with a forecast attached", () => {
  const state = runStaffCycle({ hotelBundle: bundleFixture(), referenceDate: REFERENCE_DATE });

  expect(state.period).toBe("2026-09-10");
  expect(state.cyclesElapsed).toBe(1);
  expect(state.headcount.total).toBeGreaterThan(0);
  expect(state.morale).toBeGreaterThanOrEqual(0);
  expect(state.overload).toBeGreaterThanOrEqual(0);
  expect(state.payroll.total).toBe(38000 + 9800);
  expect(Array.isArray(state.diagnostics)).toBe(true);
  expect(state.forecast.scenarios.realiste.days).toHaveLength(30);
});

test("runStaffCycle increments cyclesElapsed and records a replay entry", () => {
  const first = runStaffCycle({ hotelBundle: bundleFixture(), referenceDate: REFERENCE_DATE });
  const second = runStaffCycle({ hotelBundle: bundleFixture(), previousState: first, referenceDate: REFERENCE_DATE });

  expect(second.cyclesElapsed).toBe(2);
  expect(second.replayLog.entries).toHaveLength(2);
  expect(second.replayLog.entries[1].cycleIndex).toBe(1);
});

test("runStaffCycle counts real departures from the last DailyReport's staffChanges", () => {
  const dailyReport = { staffChanges: { departures: [{ id: 1, name: "A", reason: "morale trop basse" }] } };
  const state = runStaffCycle({ hotelBundle: bundleFixture(), dailyReport, referenceDate: REFERENCE_DATE });
  expect(state.turnover.departuresLast).toBe(1);
});

test("every STAFF_ACTION_CATALOG action applies without throwing", () => {
  STAFF_ACTION_CATALOG.forEach((action) => {
    expect(() => applyStaffDecision(bundleFixture(), action.id)).not.toThrow();
  });
});

test("staffFromCareerState builds a StaffState from a real CareerState", () => {
  const career = startCareer({ playerId: "player-1", ...createGuestHotelBundle({ referenceDate: REFERENCE_DATE }) });
  const state = staffFromCareerState(career);
  expect(state.headcount.total).toBeGreaterThan(0);
  expect(state.payroll.total).toBeGreaterThan(0);
});

test("generateStaffReport assembles every section, including the replay log", () => {
  const state = runStaffCycle({ hotelBundle: bundleFixture(), referenceDate: REFERENCE_DATE });
  const report = generateStaffReport(state);
  expect(report.headcount).toBeDefined();
  expect(report.morale).toBeDefined();
  expect(report.replay.totalCycles).toBe(1);
});

test("staffDiagnosticsToAnalytics adapts diagnostics into the Analytics shape", () => {
  const state = runStaffCycle({ hotelBundle: { ...bundleFixture(), hotelState: { finance: { payroll: 0 }, esg: {} } }, referenceDate: REFERENCE_DATE });
  const adapted = staffDiagnosticsToAnalytics(state.diagnostics);
  adapted.forEach((entry) => {
    expect(["anomaly", "error", "opportunity"]).toContain(entry.type);
    expect(entry).toHaveProperty("severity");
    expect(entry).toHaveProperty("message");
    expect(entry).toHaveProperty("cycleIndex", null);
  });
});
