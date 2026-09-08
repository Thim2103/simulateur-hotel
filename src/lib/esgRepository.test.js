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
    period: "2026-09-10",
    energy: 320,
    water: 12.5,
    waste: 45,
    co2: 210,
    score: 62,
    certifications: [{ id: "green-key", name: "Green Key", obtained: true, progress: 100 }],
    forecast: { horizonDays: 30 },
    diagnostics: [],
    cyclesElapsed: 1,
    costs: { energy: 70, water: 56, waste: 8, total: 134 },
  };
}

beforeEach(() => {
  jest.resetModules();
  window.localStorage.clear();
  mockRequireUserId.mockReset();
  mockEnsureAuthSession.mockReset();
  mockAssertSupabaseConfigured.mockReset();
});

describe("esgRepository Supabase mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockRequireUserId.mockResolvedValue("user-1");
  });

  test("getEsgState() reads the caller's own row", async () => {
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

    const { getEsgState } = require("./esgRepository");
    const state = await getEsgState();
    expect(state.period).toBe("2026-09-10");
  });

  test("saveEsgState() upserts scoped to the current user", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveEsgState } = require("./esgRepository");
    await saveEsgState(sampleState());

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.score).toBe(62);
    expect(upserted.co2).toBe(210);
  });

  test("saveEsgForecast() upserts the forecast", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveEsgForecast } = require("./esgRepository");
    await saveEsgForecast({ horizonDays: 30, generatedAt: "2026-09-10" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.forecast.horizonDays).toBe(30);
  });

  test("saveEsgCertifications() upserts one row per obtained certification", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveEsgCertifications } = require("./esgRepository");
    await saveEsgCertifications([
      { id: "green-key", name: "Green Key", obtained: true, progress: 100 },
      { id: "earthcheck", name: "EarthCheck", obtained: false, progress: 40 },
    ]);

    expect(upserted).toHaveLength(1);
    expect(upserted[0].certification_id).toBe("green-key");
  });

  test("saveEsgCertifications() is a no-op when nothing is obtained yet", async () => {
    const client = { from: () => ({ upsert: jest.fn() }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveEsgCertifications } = require("./esgRepository");
    await expect(saveEsgCertifications([{ id: "green-key", obtained: false }])).resolves.toBeUndefined();
  });
});

describe("esgRepository guest mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue(null);
    mockAssertSupabaseConfigured.mockImplementation(() => {
      throw new Error("guest mode must never reach assertSupabaseConfigured()");
    });
  });

  test("getEsgState() returns null before anything has been saved", async () => {
    const { getEsgState } = require("./esgRepository");
    await expect(getEsgState()).resolves.toBeNull();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveEsgState() persists to localStorage and getEsgState() reads it back", async () => {
    const { getEsgState, saveEsgState } = require("./esgRepository");
    await saveEsgState(sampleState());
    const reloaded = await getEsgState();

    expect(reloaded.period).toBe("2026-09-10");
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveEsgForecast()/saveEsgCertifications() are no-ops that never throw or touch Supabase", async () => {
    const { saveEsgForecast, saveEsgCertifications } = require("./esgRepository");
    await expect(saveEsgForecast({ horizonDays: 30 })).resolves.toBeUndefined();
    await expect(saveEsgCertifications(sampleState().certifications)).resolves.toBeUndefined();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });
});
