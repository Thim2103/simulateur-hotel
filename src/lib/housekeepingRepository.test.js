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
    workload: { roomsToClean: 6, priorities: { arrivals: 2, departures: 6, stayovers: 3 } },
    cleaningTime: { totalMinutes: 240, minutesPerRoom: 30 },
    productivity: 68,
    overload: 72,
    understaffing: { understaffed: false, shortfall: 0 },
    quality: 74,
    housekeeperCount: 3,
    cost: 7800,
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

describe("housekeepingRepository Supabase mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockRequireUserId.mockResolvedValue("user-1");
  });

  test("getHousekeepingState() reads the caller's own row", async () => {
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

    const { getHousekeepingState } = require("./housekeepingRepository");
    const state = await getHousekeepingState();
    expect(state.period).toBe("2026-09-10");
  });

  test("saveHousekeepingState() upserts scoped to the current user", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveHousekeepingState } = require("./housekeepingRepository");
    await saveHousekeepingState(sampleState());

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.quality).toBe(74);
    expect(upserted.overload).toBe(72);
  });

  test("saveHousekeepingForecast() upserts the forecast", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveHousekeepingForecast } = require("./housekeepingRepository");
    await saveHousekeepingForecast({ horizonDays: 30, generatedAt: "2026-09-10" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.forecast.horizonDays).toBe(30);
  });
});

describe("housekeepingRepository guest mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue(null);
    mockAssertSupabaseConfigured.mockImplementation(() => {
      throw new Error("guest mode must never reach assertSupabaseConfigured()");
    });
  });

  test("getHousekeepingState() returns null before anything has been saved", async () => {
    const { getHousekeepingState } = require("./housekeepingRepository");
    await expect(getHousekeepingState()).resolves.toBeNull();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveHousekeepingState() persists to localStorage and getHousekeepingState() reads it back", async () => {
    const { getHousekeepingState, saveHousekeepingState } = require("./housekeepingRepository");
    await saveHousekeepingState(sampleState());
    const reloaded = await getHousekeepingState();

    expect(reloaded.period).toBe("2026-09-10");
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveHousekeepingForecast() is a no-op that never throws or touches Supabase", async () => {
    const { saveHousekeepingForecast } = require("./housekeepingRepository");
    await expect(saveHousekeepingForecast({ horizonDays: 30 })).resolves.toBeUndefined();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });
});
