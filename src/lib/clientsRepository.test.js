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
    segments: { business: 28, leisure: 42, famille: 18, premium: 12 },
    satisfaction: 71,
    loyalty: 63,
    reviews: { avgRating: 4.0, count: 18, positive: 78, negative: 10, trend: "stable" },
    complaints: [],
    behaviors: { avgSpend: 195, returnRate: 48, preferredSegment: "leisure" },
    forecast: { horizonDays: 30 },
    diagnostics: [],
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

describe("clientsRepository Supabase mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockRequireUserId.mockResolvedValue("user-1");
  });

  test("getClientsState() reads the caller's own row", async () => {
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

    const { getClientsState } = require("./clientsRepository");
    const state = await getClientsState();
    expect(state.period).toBe("2026-09-16");
    expect(state.satisfaction).toBe(71);
  });

  test("saveClientsState() upserts scoped to the current user", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveClientsState } = require("./clientsRepository");
    await saveClientsState(sampleState());

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.satisfaction).toBe(71);
    expect(upserted.loyalty).toBe(63);
  });

  test("saveClientsForecast() upserts the forecast", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveClientsForecast } = require("./clientsRepository");
    await saveClientsForecast({ horizonDays: 30, generatedAt: "2026-09-16" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.forecast.horizonDays).toBe(30);
  });
});

describe("clientsRepository guest mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue(null);
    mockAssertSupabaseConfigured.mockImplementation(() => {
      throw new Error("guest mode must never reach assertSupabaseConfigured()");
    });
  });

  test("getClientsState() returns null before anything has been saved", async () => {
    const { getClientsState } = require("./clientsRepository");
    await expect(getClientsState()).resolves.toBeNull();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveClientsState() persists to localStorage and getClientsState() reads it back", async () => {
    const { getClientsState, saveClientsState } = require("./clientsRepository");
    await saveClientsState(sampleState());
    const reloaded = await getClientsState();

    expect(reloaded.period).toBe("2026-09-16");
    expect(reloaded.satisfaction).toBe(71);
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveClientsForecast() is a no-op that never throws or touches Supabase", async () => {
    const { saveClientsForecast } = require("./clientsRepository");
    await expect(saveClientsForecast({ horizonDays: 30 })).resolves.toBeUndefined();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });
});
