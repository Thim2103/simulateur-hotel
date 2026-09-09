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
    foodCost: { overall: 27.5, byCategory: {}, wastePct: 20, volatilityIndex: 18 },
    popularity: { items: [], trending: [], declining: [] },
    profitability: { items: [], grossMargin: 63, netMargin: 35, topMargin: [], bottomMargin: [] },
    menuEngineering: { items: [], counts: { stars: 2, plowhorses: 1, puzzles: 1, dogs: 0 } },
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

describe("restaurantAdvancedRepository Supabase mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockRequireUserId.mockResolvedValue("user-1");
  });

  test("getRestaurantAdvancedState() reads the caller's own row", async () => {
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

    const { getRestaurantAdvancedState } = require("./restaurantAdvancedRepository");
    const state = await getRestaurantAdvancedState();
    expect(state.period).toBe("2026-09-16");
    expect(state.foodCost.overall).toBe(27.5);
  });

  test("saveRestaurantAdvancedState() upserts scoped to the current user", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveRestaurantAdvancedState } = require("./restaurantAdvancedRepository");
    await saveRestaurantAdvancedState(sampleState());

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.food_cost.overall).toBe(27.5);
    expect(upserted.profitability.grossMargin).toBe(63);
  });

  test("saveRestaurantAdvancedForecast() upserts the forecast", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveRestaurantAdvancedForecast } = require("./restaurantAdvancedRepository");
    await saveRestaurantAdvancedForecast({ horizonDays: 30, generatedAt: "2026-09-16" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.forecast.horizonDays).toBe(30);
  });
});

describe("restaurantAdvancedRepository guest mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue(null);
    mockAssertSupabaseConfigured.mockImplementation(() => {
      throw new Error("guest mode must never reach assertSupabaseConfigured()");
    });
  });

  test("getRestaurantAdvancedState() returns null before anything has been saved", async () => {
    const { getRestaurantAdvancedState } = require("./restaurantAdvancedRepository");
    await expect(getRestaurantAdvancedState()).resolves.toBeNull();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveRestaurantAdvancedState() persists to localStorage and getRestaurantAdvancedState() reads it back", async () => {
    const { getRestaurantAdvancedState, saveRestaurantAdvancedState } = require("./restaurantAdvancedRepository");
    await saveRestaurantAdvancedState(sampleState());
    const reloaded = await getRestaurantAdvancedState();

    expect(reloaded.period).toBe("2026-09-16");
    expect(reloaded.foodCost.overall).toBe(27.5);
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveRestaurantAdvancedForecast() is a no-op that never throws or touches Supabase", async () => {
    const { saveRestaurantAdvancedForecast } = require("./restaurantAdvancedRepository");
    await expect(saveRestaurantAdvancedForecast({ horizonDays: 30 })).resolves.toBeUndefined();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });
});
