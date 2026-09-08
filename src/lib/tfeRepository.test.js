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
    tfeId: "tfe-1",
    status: "active",
    hotelConfig: { roomCount: 30, positioningTier: "midscale", strategy: "rentabilite" },
    month: 5,
    horizonMonths: 36,
    chapters: [{ id: "annee-1", title: "Année 1 : Lancement" }],
    missions: [],
    objectives: [],
    performanceHistory: [{ month: 5, score: 60 }],
    score: { total: 60, grade: "C" },
    diagnostics: [],
    forecast: { horizonMonths: 36 },
    report: null,
  };
}

beforeEach(() => {
  jest.resetModules();
  window.localStorage.clear();
  mockRequireUserId.mockReset();
  mockEnsureAuthSession.mockReset();
  mockAssertSupabaseConfigured.mockReset();
});

describe("tfeRepository Supabase mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockRequireUserId.mockResolvedValue("user-1");
  });

  test("getTfeState() reads the caller's own row", async () => {
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

    const { getTfeState } = require("./tfeRepository");
    const state = await getTfeState();
    expect(state.tfeId).toBe("tfe-1");
  });

  test("saveTfeState() upserts scoped to the current user", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveTfeState } = require("./tfeRepository");
    await saveTfeState(sampleState());

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.metadata.month).toBe(5);
    expect(upserted.score.total).toBe(60);
  });

  test("saveTfeReport() upserts the final report", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveTfeReport } = require("./tfeRepository");
    await saveTfeReport({ grade: "B", generatedAt: "2026-09-10" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.report.grade).toBe("B");
  });

  test("saveTfeScore() upserts the score", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveTfeScore } = require("./tfeRepository");
    await saveTfeScore({ total: 70, grade: "B" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.score.total).toBe(70);
  });

  test("saveTfeForecast() upserts the forecast", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveTfeForecast } = require("./tfeRepository");
    await saveTfeForecast({ horizonMonths: 36, generatedAt: "2026-09-10" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.forecast.horizonMonths).toBe(36);
  });
});

describe("tfeRepository guest mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue(null);
    mockAssertSupabaseConfigured.mockImplementation(() => {
      throw new Error("guest mode must never reach assertSupabaseConfigured()");
    });
  });

  test("getTfeState() returns null before anything has been saved", async () => {
    const { getTfeState } = require("./tfeRepository");
    await expect(getTfeState()).resolves.toBeNull();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveTfeState() persists to localStorage and getTfeState() reads it back", async () => {
    const { getTfeState, saveTfeState } = require("./tfeRepository");
    await saveTfeState(sampleState());
    const reloaded = await getTfeState();

    expect(reloaded.tfeId).toBe("tfe-1");
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveTfeReport()/saveTfeScore()/saveTfeForecast() are no-ops that never throw or touch Supabase", async () => {
    const { saveTfeReport, saveTfeScore, saveTfeForecast } = require("./tfeRepository");
    await expect(saveTfeReport({ grade: "B" })).resolves.toBeUndefined();
    await expect(saveTfeScore({ total: 70 })).resolves.toBeUndefined();
    await expect(saveTfeForecast({ horizonMonths: 36 })).resolves.toBeUndefined();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });
});
