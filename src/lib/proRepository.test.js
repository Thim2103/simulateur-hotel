const mockRequireUserId = jest.fn();
const mockEnsureAuthSession = jest.fn();
const mockAssertSupabaseConfigured = jest.fn();

jest.mock("./supabase", () => ({
  requireUserId: (...args) => mockRequireUserId(...args),
  ensureAuthSession: (...args) => mockEnsureAuthSession(...args),
  assertSupabaseConfigured: (...args) => mockAssertSupabaseConfigured(...args),
}));

function sampleState() {
  return {
    proId: "pro-1",
    status: "active",
    hotelConfig: { roomCount: 30, positioningTier: "midscale", strategy: "optimisation" },
    month: 3,
    horizonMonths: 24,
    phases: [{ id: "phase-1" }],
    crises: [{ id: "inflation", active: true }],
    opportunities: [],
    audits: [{ department: "finance", score: 70 }],
    objectives: [],
    missions: [],
    performanceHistory: [{ month: 3, score: 65 }],
    score: { total: 65, grade: "C" },
    forecast: { horizonMonths: 24 },
    diagnostics: [],
    report: {},
  };
}

beforeEach(() => {
  jest.resetModules();
  window.localStorage.clear();
  mockRequireUserId.mockReset();
  mockEnsureAuthSession.mockReset();
  mockAssertSupabaseConfigured.mockReset();
});

describe("proRepository Supabase mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockRequireUserId.mockResolvedValue("user-1");
  });

  test("getProState() reads the caller's own row", async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: () => Promise.resolve({ data: [{ state: sampleState() }], error: null }),
          }),
        }),
      }),
    };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { getProState } = require("./proRepository");
    const state = await getProState();
    expect(state.proId).toBe("pro-1");
    expect(state.month).toBe(3);
  });

  test("saveProState() upserts scoped to the current user", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveProState } = require("./proRepository");
    await saveProState(sampleState());

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.crises).toHaveLength(1);
    expect(upserted.audits).toHaveLength(1);
  });

  test("saveProReport() upserts the report", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveProReport } = require("./proRepository");
    await saveProReport({ finalScore: { total: 80 }, grade: "B" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.report.finalScore.total).toBe(80);
  });

  test("saveProScore() upserts the score", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveProScore } = require("./proRepository");
    await saveProScore({ total: 70, grade: "C" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.score.total).toBe(70);
  });

  test("saveProForecast() upserts the forecast", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveProForecast } = require("./proRepository");
    await saveProForecast({ horizonMonths: 24, generatedAt: "2026-09-16" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.forecast.horizonMonths).toBe(24);
  });

  test("saveProDiagnostics() upserts the diagnostics list", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveProDiagnostics } = require("./proRepository");
    await saveProDiagnostics([{ type: "opportunity", severity: "low", message: "Test" }]);

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.diagnostics).toHaveLength(1);
  });
});

describe("proRepository guest mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue(null);
    mockAssertSupabaseConfigured.mockImplementation(() => {
      throw new Error("guest mode must never reach assertSupabaseConfigured()");
    });
  });

  test("getProState() returns null before anything has been saved", async () => {
    const { getProState } = require("./proRepository");
    await expect(getProState()).resolves.toBeNull();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveProState() persists to localStorage and getProState() reads it back", async () => {
    const { getProState, saveProState } = require("./proRepository");
    await saveProState(sampleState());
    const reloaded = await getProState();

    expect(reloaded.proId).toBe("pro-1");
    expect(reloaded.month).toBe(3);
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveProReport()/saveProScore()/saveProForecast()/saveProDiagnostics() are no-ops that never throw or touch Supabase", async () => {
    const { saveProReport, saveProScore, saveProForecast, saveProDiagnostics } = require("./proRepository");
    await expect(saveProReport({})).resolves.toBeUndefined();
    await expect(saveProScore({})).resolves.toBeUndefined();
    await expect(saveProForecast({})).resolves.toBeUndefined();
    await expect(saveProDiagnostics([])).resolves.toBeUndefined();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });
});
