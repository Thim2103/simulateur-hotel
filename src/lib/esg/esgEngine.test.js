import { runEsgCycle, esgFromCareerState, applyEsgAction, generateEsgReport, esgDiagnosticsToAnalytics, ESG_ACTION_CATALOG } from "./esgEngine";
import { startCareer } from "../career/careerEngine";
import { createGuestHotelBundle } from "../guest";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function bundleFixture() {
  return {
    hotelState: {
      esg: { energyConsumption: 62, waterUsage: 55, wasteReduction: 40, sustainabilityScore: 58, certifications: [], monthlyInvestment: 2400 },
      finance: { fixedCosts: 21000 },
    },
    restaurantState: {
      esg: { wasteReduction: 35, localSourcing: 60, energyEfficiency: 40, staffWellbeing: 70, monthlyInvestment: 900 },
      menu: [{ sales: 26 }, { sales: 18 }],
    },
    rooms: Array.from({ length: 10 }, (_, i) => ({ id: i, status: i < 4 ? "occupée" : "libre" })),
    reservations: [],
  };
}

test("runEsgCycle returns a fully-shaped EsgState with a forecast attached", () => {
  const state = runEsgCycle({ hotelBundle: bundleFixture(), referenceDate: REFERENCE_DATE });

  expect(state.period).toBe("2026-09-10");
  expect(state.cyclesElapsed).toBe(1);
  expect(state.energy).toBeGreaterThan(0);
  expect(state.water).toBeGreaterThan(0);
  expect(state.waste).toBeGreaterThan(0);
  expect(state.co2).toBeGreaterThan(0);
  expect(state.score).toBeGreaterThanOrEqual(0);
  expect(state.certifications.length).toBeGreaterThan(0);
  expect(Array.isArray(state.diagnostics)).toBe(true);
  expect(state.forecast.scenarios.realiste.days).toHaveLength(30);
});

test("runEsgCycle increments cyclesElapsed and records a replay entry", () => {
  const first = runEsgCycle({ hotelBundle: bundleFixture(), referenceDate: REFERENCE_DATE });
  const second = runEsgCycle({ hotelBundle: bundleFixture(), previousState: first, referenceDate: REFERENCE_DATE });

  expect(second.cyclesElapsed).toBe(2);
  expect(second.replayLog.entries).toHaveLength(2);
  expect(second.replayLog.entries[1].cycleIndex).toBe(1);
});

test("runEsgCycle folds in staffMorale/staffOverload into the score and diagnostics", () => {
  const withOverload = runEsgCycle({ hotelBundle: bundleFixture(), staffOverload: 200, referenceDate: REFERENCE_DATE });
  expect(withOverload.diagnostics.some((d) => d.message.includes("bien-être"))).toBe(true);
});

test("every ESG_ACTION_CATALOG action applies without throwing", () => {
  const state = runEsgCycle({ hotelBundle: bundleFixture(), referenceDate: REFERENCE_DATE });
  ESG_ACTION_CATALOG.forEach((action) => {
    expect(() => applyEsgAction(bundleFixture(), action.id, {}, state)).not.toThrow();
  });
});

test("esgFromCareerState builds an EsgState from a real CareerState", () => {
  const career = startCareer({ playerId: "player-1", ...createGuestHotelBundle({ referenceDate: REFERENCE_DATE }) });
  const state = esgFromCareerState(career);
  expect(state.energy).toBeGreaterThanOrEqual(0);
  expect(state.score).toBeGreaterThanOrEqual(0);
});

test("generateEsgReport assembles every section, including the replay log", () => {
  const state = runEsgCycle({ hotelBundle: bundleFixture(), referenceDate: REFERENCE_DATE });
  const report = generateEsgReport(state);
  expect(report.energy).toBeDefined();
  expect(report.certifications.length).toBeGreaterThan(0);
  expect(report.replay.totalCycles).toBe(1);
});

test("esgDiagnosticsToAnalytics adapts diagnostics into the Analytics shape", () => {
  const state = runEsgCycle({
    hotelBundle: { ...bundleFixture(), hotelState: { esg: { energyConsumption: 100, sustainabilityScore: 5 }, finance: {} } },
    referenceDate: REFERENCE_DATE,
  });
  const adapted = esgDiagnosticsToAnalytics(state.diagnostics);
  expect(adapted.length).toBeGreaterThan(0);
  adapted.forEach((entry) => {
    expect(["anomaly", "error", "opportunity"]).toContain(entry.type);
    expect(entry).toHaveProperty("severity");
    expect(entry).toHaveProperty("message");
    expect(entry).toHaveProperty("cycleIndex", null);
  });
});
