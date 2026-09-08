import { runMarketingCycle, marketingFromCareerState, generateMarketingReport, marketingDiagnosticsToAnalytics, MARKETING_ACTION_CATALOG, applyMarketingDecision } from "./marketingEngine";
import { startCareer } from "../career/careerEngine";
import { createGuestHotelBundle } from "../guest";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function bundleFixture() {
  return {
    hotelState: {
      structure: { starRating: 4 },
      finance: { revenue: [10000], costs: [5000] },
      marketing: {
        budget: 6500,
        channels: [
          { id: "ota", name: "OTA", enabled: true, budget: 2200, reach: 68 },
          { id: "direct", name: "Direct", enabled: true, budget: 900, reach: 47 },
        ],
        campaigns: [{ id: 1, name: "Été", objective: "Acquisition", status: "active", budget: 3000, conversion: 7, roi: 2.1, demandUplift: 6 }],
      },
      esg: { sustainabilityScore: 58 },
    },
    restaurantState: { finance: { revenue: [3000], costs: [1500] } },
    rooms: Array.from({ length: 10 }, (_, i) => ({ id: i, status: i < 4 ? "occupée" : "libre" })),
    reservations: [{ status: "confirmée", price: 150, arrival: "2026-09-10", departure: "2026-09-12" }],
  };
}

test("runMarketingCycle returns a fully-shaped MarketingState with a forecast attached", () => {
  const state = runMarketingCycle({ hotelBundle: bundleFixture(), referenceDate: REFERENCE_DATE });

  expect(state.period).toBe("2026-09-10");
  expect(state.cyclesElapsed).toBe(1);
  expect(state.budget.total).toBeGreaterThan(0);
  expect(state.roi.overallRoi).toBeGreaterThanOrEqual(0);
  expect(state.conversion.conversionRate).toBeGreaterThanOrEqual(0);
  expect(state.reputation).toBeGreaterThanOrEqual(0);
  expect(state.positioningTier).toBe("upscale"); // starRating 4
  expect(Array.isArray(state.diagnostics)).toBe(true);
  expect(state.forecast.scenarios.realiste.days).toHaveLength(30);
});

test("runMarketingCycle increments cyclesElapsed and records a replay entry", () => {
  const first = runMarketingCycle({ hotelBundle: bundleFixture(), referenceDate: REFERENCE_DATE });
  const second = runMarketingCycle({ hotelBundle: bundleFixture(), previousState: first, referenceDate: REFERENCE_DATE });

  expect(second.cyclesElapsed).toBe(2);
  expect(second.replayLog.entries).toHaveLength(2);
  expect(second.replayLog.entries[1].cycleIndex).toBe(1);
});

test("runMarketingCycle folds in an externally-provided staffOverload for diagnostics", () => {
  const state = runMarketingCycle({ hotelBundle: bundleFixture(), staffOverload: 200, referenceDate: REFERENCE_DATE });
  expect(state.diagnostics.some((d) => d.message.includes("surcharge"))).toBe(true);
});

test("every MARKETING_ACTION_CATALOG action applies without throwing", () => {
  MARKETING_ACTION_CATALOG.forEach((action) => {
    expect(() => applyMarketingDecision(bundleFixture(), action.id)).not.toThrow();
  });
});

test("marketingFromCareerState builds a MarketingState from a real CareerState", () => {
  const career = startCareer({ playerId: "player-1", ...createGuestHotelBundle({ referenceDate: REFERENCE_DATE }) });
  const state = marketingFromCareerState(career);
  expect(state.budget.total).toBeGreaterThanOrEqual(0);
  expect(state.positioningTier).toBeDefined();
});

test("generateMarketingReport assembles every section, including the replay log", () => {
  const state = runMarketingCycle({ hotelBundle: bundleFixture(), referenceDate: REFERENCE_DATE });
  const report = generateMarketingReport(state);
  expect(report.budget).toBeDefined();
  expect(report.roi).toBeDefined();
  expect(report.replay.totalCycles).toBe(1);
});

test("marketingDiagnosticsToAnalytics adapts diagnostics into the Analytics shape", () => {
  const state = runMarketingCycle({ hotelBundle: { ...bundleFixture(), hotelState: { ...bundleFixture().hotelState, marketing: { budget: 0, channels: [], campaigns: [] } } }, referenceDate: REFERENCE_DATE });
  const adapted = marketingDiagnosticsToAnalytics(state.diagnostics);
  adapted.forEach((entry) => {
    expect(["anomaly", "error", "opportunity"]).toContain(entry.type);
    expect(entry).toHaveProperty("severity");
    expect(entry).toHaveProperty("message");
    expect(entry).toHaveProperty("cycleIndex", null);
  });
});
