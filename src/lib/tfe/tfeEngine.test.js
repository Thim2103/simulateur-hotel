import { startTfe, playTfeMonth, applyTfeAction, buildTfeReplayRun, analyzeTfeRun, tfeDiagnosticsToAnalytics, TFE_ACTION_CATALOG } from "./tfeEngine";

const REFERENCE_DATE = new Date("2026-09-10T12:00:00Z");

function baseConfig(overrides = {}) {
  return { roomCount: 30, positioningTier: "midscale", strategy: "rentabilite", segments: ["leisure", "business"], ...overrides };
}

describe("startTfe", () => {
  test("returns an active TfeState with a fresh 30-room hotel and a seeded storyline", () => {
    const state = startTfe({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });

    expect(state.status).toBe("active");
    expect(state.month).toBe(0);
    expect(state.horizonMonths).toBe(36);
    expect(state.career.hotel.rooms).toHaveLength(30);
    expect(state.chapters.length).toBeGreaterThan(0);
    expect(state.missions.length).toBeGreaterThan(0);
    expect(state.objectives.length).toBeGreaterThan(0);
    expect(state.tfeId).toBeTruthy();
  });
});

describe("playTfeMonth", () => {
  test("advances the month and computes a full performance entry", async () => {
    const state = startTfe({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
    const { state: nextState, monthReport } = await playTfeMonth({ tfeState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

    expect(nextState.month).toBe(1);
    expect(nextState.status).toBe("active");
    expect(nextState.performanceHistory).toHaveLength(1);
    expect(nextState.score.total).toBeGreaterThanOrEqual(0);
    expect(nextState.forecast.scenarios.realiste.months).toHaveLength(36);
    expect(monthReport.performanceEntry.month).toBe(1);
    expect(Array.isArray(monthReport.missionsJustCompleted)).toBe(true);
  });

  test("is a no-op once the TFE is already completed", async () => {
    const state = { status: "completed", month: 36 };
    const { state: nextState, monthReport } = await playTfeMonth({ tfeState: state });
    expect(nextState).toBe(state);
    expect(monthReport).toBeNull();
  });

  test("marks the TFE completed and generates the final report at month 36", async () => {
    let state = startTfe({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
    for (let month = 1; month <= 36; month += 1) {
      // eslint-disable-next-line no-await-in-loop
      const result = await playTfeMonth({ tfeState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
      state = result.state;
    }

    expect(state.status).toBe("completed");
    expect(state.month).toBe(36);
    expect(state.performanceHistory).toHaveLength(36);
    expect(state.report).not.toBeNull();
    expect(state.report.finalScore.total).toBe(state.score.total);
  }, 20000);

  test("applies the scripted month-6 timeline event automatically", async () => {
    let state = startTfe({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
    let lastMonthReport = null;
    for (let month = 1; month <= 6; month += 1) {
      // eslint-disable-next-line no-await-in-loop
      const result = await playTfeMonth({ tfeState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
      state = result.state;
      lastMonthReport = result.monthReport;
    }

    expect(lastMonthReport.scheduledEvents.some((event) => event.id === "economic-slowdown")).toBe(true);
  }, 10000);
});

test("every TFE_ACTION_CATALOG action applies without throwing", () => {
  const state = startTfe({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
  TFE_ACTION_CATALOG.forEach((action) => {
    expect(() => applyTfeAction(state, action.id)).not.toThrow();
  });
});

test("applyTfeAction returns a new TfeState with the mutated hotel bundle, without mutating the input", () => {
  const state = startTfe({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
  const frozenBudget = state.career.hotel.hotelState.marketing.budget;
  const nextState = applyTfeAction(state, "plan-relance");

  expect(nextState.career.hotel.hotelState.marketing.budget).toBeGreaterThan(frozenBudget);
  expect(state.career.hotel.hotelState.marketing.budget).toBe(frozenBudget);
});

describe("buildTfeReplayRun / analyzeTfeRun", () => {
  test("build a real ReplayRun and Analysis from a played TFE", async () => {
    let state = startTfe({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
    const result = await playTfeMonth({ tfeState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });
    state = result.state;

    const replayRun = buildTfeReplayRun(state);
    expect(replayRun.cycles.length).toBeGreaterThan(0);

    const analysis = analyzeTfeRun(state);
    expect(analysis.diagnostics).toBeDefined();
  });
});

test("tfeDiagnosticsToAnalytics adapts diagnostics into the Analytics shape", async () => {
  const state = startTfe({ playerId: "player-1", hotelConfig: baseConfig(), referenceDate: REFERENCE_DATE });
  const { state: nextState } = await playTfeMonth({ tfeState: state, referenceDate: REFERENCE_DATE, rng: () => 0.999 });

  const adapted = tfeDiagnosticsToAnalytics(nextState.diagnostics);
  adapted.forEach((entry) => {
    expect(["anomaly", "error", "opportunity"]).toContain(entry.type);
    expect(entry).toHaveProperty("severity");
    expect(entry).toHaveProperty("message");
    expect(entry).toHaveProperty("cycleIndex", null);
  });
});
