import { startPro, playProMonth, applyProAction, buildProReplayRun, analyzeProRun, proDiagnosticsToAnalytics, PRO_ACTION_CATALOG } from "./proEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function baseConfig(overrides = {}) {
  return { roomCount: 30, positioningTier: "midscale", strategy: "optimisation", segments: ["leisure", "business"], ...overrides };
}

describe("startPro", () => {
  test("returns an active ProState with a fresh 30-room hotel and a seeded storyline", () => {
    const state = startPro({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });

    expect(state.status).toBe("active");
    expect(state.month).toBe(0);
    expect(state.horizonMonths).toBe(24);
    expect(state.career.hotel.rooms).toHaveLength(30);
    expect(state.phases.length).toBeGreaterThan(0);
    expect(state.missions.length).toBeGreaterThan(0);
    expect(state.objectives.length).toBeGreaterThan(0);
    expect(state.crises).toEqual([]);
    expect(state.opportunities).toEqual([]);
    expect(state.audits).toEqual([]);
    expect(state.proId).toBeTruthy();
  });
});

describe("playProMonth", () => {
  test("advances the month and computes a full performance entry", async () => {
    const state = startPro({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
    const { state: nextState, monthReport } = await playProMonth({ proState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

    expect(nextState.month).toBe(1);
    expect(nextState.status).toBe("active");
    expect(nextState.performanceHistory).toHaveLength(1);
    expect(nextState.score.total).toBeGreaterThanOrEqual(0);
    expect(nextState.forecast.scenarios.realiste.months).toHaveLength(24);
    expect(nextState.audits.length).toBeGreaterThan(0);
    expect(monthReport.performanceEntry.month).toBe(1);
    expect(Array.isArray(monthReport.missionsJustCompleted)).toBe(true);
  });

  test("is a no-op once the Pro run is already completed", async () => {
    const state = { status: "completed", month: 24 };
    const { state: nextState, monthReport } = await playProMonth({ proState: state });
    expect(nextState).toBe(state);
    expect(monthReport).toBeNull();
  });

  test("marks the Pro run completed and generates the final report at month 24", async () => {
    let state = startPro({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
    for (let month = 1; month <= 24; month += 1) {
      // eslint-disable-next-line no-await-in-loop
      const result = await playProMonth({ proState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
      state = result.state;
    }

    expect(state.status).toBe("completed");
    expect(state.month).toBe(24);
    expect(state.performanceHistory).toHaveLength(24);
    expect(state.report).not.toBeNull();
    expect(state.report.finalScore.total).toBe(state.score.total);
  }, 20000);

  test("applies the scripted month-3 inflation crisis automatically", async () => {
    let state = startPro({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
    let lastMonthReport = null;
    for (let month = 1; month <= 3; month += 1) {
      // eslint-disable-next-line no-await-in-loop
      const result = await playProMonth({ proState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
      state = result.state;
      lastMonthReport = result.monthReport;
    }

    expect(lastMonthReport.scheduledEvents.some((event) => event.id === "inflation")).toBe(true);
    expect(state.crises.some((crisis) => crisis.id === "inflation" && crisis.active)).toBe(true);
  }, 10000);
});

test("every PRO_ACTION_CATALOG action applies without throwing", () => {
  const state = startPro({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
  PRO_ACTION_CATALOG.forEach((action) => {
    expect(() => applyProAction(state, action.id)).not.toThrow();
  });
});

test("applyProAction returns a new ProState with the mutated hotel bundle, without mutating the input", () => {
  const state = startPro({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
  const frozenBudget = state.career.hotel.hotelState.marketing.budget;
  const nextState = applyProAction(state, "plan-relance-globale");

  expect(nextState.career.hotel.hotelState.marketing.budget).toBeGreaterThan(frozenBudget);
  expect(state.career.hotel.hotelState.marketing.budget).toBe(frozenBudget);
});

describe("buildProReplayRun / analyzeProRun", () => {
  test("build a real ReplayRun and Analysis from a played Pro run", async () => {
    let state = startPro({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
    const result = await playProMonth({ proState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
    state = result.state;

    const replayRun = buildProReplayRun(state);
    expect(replayRun.cycles.length).toBeGreaterThan(0);

    const analysis = analyzeProRun(state);
    expect(analysis.diagnostics).toBeDefined();
  });
});

test("proDiagnosticsToAnalytics adapts diagnostics into the Analytics shape", async () => {
  const state = startPro({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
  const { state: nextState } = await playProMonth({ proState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  const adapted = proDiagnosticsToAnalytics(nextState.diagnostics);
  adapted.forEach((entry) => {
    expect(["anomaly", "error", "opportunity"]).toContain(entry.type);
    expect(entry).toHaveProperty("severity");
    expect(entry).toHaveProperty("message");
    expect(entry).toHaveProperty("cycleIndex", null);
  });
});
