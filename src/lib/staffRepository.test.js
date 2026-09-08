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
    headcount: { hotel: 10, restaurant: 6, total: 16 },
    morale: 72,
    productivity: 78,
    absenteeism: 8,
    overload: 65,
    turnover: { estimatedRate: 4, actualRateLastCycle: 0, departuresLast: 0 },
    payroll: { hotel: 38000, restaurant: 9800, total: 47800 },
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

describe("staffRepository Supabase mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockRequireUserId.mockResolvedValue("user-1");
  });

  test("getStaffState() reads the caller's own row", async () => {
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

    const { getStaffState } = require("./staffRepository");
    const state = await getStaffState();
    expect(state.period).toBe("2026-09-10");
  });

  test("saveStaffState() upserts scoped to the current user", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveStaffState } = require("./staffRepository");
    await saveStaffState(sampleState());

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.moral).toBe(72);
    expect(upserted.overload).toBe(65);
  });

  test("saveStaffForecast() upserts the forecast", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveStaffForecast } = require("./staffRepository");
    await saveStaffForecast({ horizonDays: 30, generatedAt: "2026-09-10" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.forecast.horizonDays).toBe(30);
  });
});

describe("staffRepository guest mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue(null);
    mockAssertSupabaseConfigured.mockImplementation(() => {
      throw new Error("guest mode must never reach assertSupabaseConfigured()");
    });
  });

  test("getStaffState() returns null before anything has been saved", async () => {
    const { getStaffState } = require("./staffRepository");
    await expect(getStaffState()).resolves.toBeNull();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveStaffState() persists to localStorage and getStaffState() reads it back", async () => {
    const { getStaffState, saveStaffState } = require("./staffRepository");
    await saveStaffState(sampleState());
    const reloaded = await getStaffState();

    expect(reloaded.period).toBe("2026-09-10");
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveStaffForecast() is a no-op that never throws or touches Supabase", async () => {
    const { saveStaffForecast } = require("./staffRepository");
    await expect(saveStaffForecast({ horizonDays: 30 })).resolves.toBeUndefined();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });
});
