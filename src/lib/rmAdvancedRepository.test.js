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
    period: "2026-09-16",
    compression: { byDate: [], avgCompression: 68, highCompressionDates: [], lowOccupancyDates: [] },
    displacement: { bySegment: {}, totalLoss: 120, worstDates: [] },
    pickupCurves: { curve: [], momentum: 12 },
    otaStrategy: { otaShare: 35, directShare: 45, channels: {}, netAdrByChannel: {} },
    specialPricing: { events: [], corporateRate: 100 },
    diagnostics: [],
    forecast: { horizonDays: 30 },
    cyclesElapsed: 1,
  };
}

beforeEach(() => {
  jest.resetModules();
  window.localStorage.clear();
  mockRequireUserId.mockReset();
  mockEnsureAuthSession.mockReset();
  mockAssertSupabaseConfigured.mockReset();
});

describe("rmAdvancedRepository Supabase mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockRequireUserId.mockResolvedValue("user-1");
  });

  test("getRmAdvancedState() reads the caller's own row", async () => {
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

    const { getRmAdvancedState } = require("./rmAdvancedRepository");
    const state = await getRmAdvancedState();
    expect(state.period).toBe("2026-09-16");
    expect(state.compression.avgCompression).toBe(68);
  });

  test("saveRmAdvancedState() upserts scoped to the current user", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveRmAdvancedState } = require("./rmAdvancedRepository");
    await saveRmAdvancedState(sampleState());

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.ota_share).toBe(35);
    expect(upserted.direct_share).toBe(45);
  });

  test("saveRmAdvancedForecast() upserts the forecast", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveRmAdvancedForecast } = require("./rmAdvancedRepository");
    await saveRmAdvancedForecast({ horizonDays: 30, generatedAt: "2026-09-16" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.forecast.horizonDays).toBe(30);
  });

  test("saveRmAdvancedDiagnostics() upserts the diagnostics list", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveRmAdvancedDiagnostics } = require("./rmAdvancedRepository");
    await saveRmAdvancedDiagnostics([{ type: "opportunity", severity: "low", message: "Test" }]);

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.diagnostics).toHaveLength(1);
  });
});

describe("rmAdvancedRepository guest mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue(null);
    mockAssertSupabaseConfigured.mockImplementation(() => {
      throw new Error("guest mode must never reach assertSupabaseConfigured()");
    });
  });

  test("getRmAdvancedState() returns null before anything has been saved", async () => {
    const { getRmAdvancedState } = require("./rmAdvancedRepository");
    await expect(getRmAdvancedState()).resolves.toBeNull();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveRmAdvancedState() persists to localStorage and getRmAdvancedState() reads it back", async () => {
    const { getRmAdvancedState, saveRmAdvancedState } = require("./rmAdvancedRepository");
    await saveRmAdvancedState(sampleState());
    const reloaded = await getRmAdvancedState();

    expect(reloaded.period).toBe("2026-09-16");
    expect(reloaded.compression.avgCompression).toBe(68);
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveRmAdvancedForecast() is a no-op that never throws or touches Supabase", async () => {
    const { saveRmAdvancedForecast } = require("./rmAdvancedRepository");
    await expect(saveRmAdvancedForecast({ horizonDays: 30 })).resolves.toBeUndefined();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveRmAdvancedDiagnostics() is a no-op that never throws or touches Supabase", async () => {
    const { saveRmAdvancedDiagnostics } = require("./rmAdvancedRepository");
    await expect(saveRmAdvancedDiagnostics([])).resolves.toBeUndefined();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });
});
