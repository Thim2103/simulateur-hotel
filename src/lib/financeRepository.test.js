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
    incomeStatement: { revenues: { total: 1000 }, expenses: { total: 600 }, gop: 500, ebitda: 400 },
    cashFlow: { closingCash: 50000 },
    ratios: { goppar: 20 },
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

describe("financeRepository Supabase mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockRequireUserId.mockResolvedValue("user-1");
  });

  test("getFinanceState() reads the caller's own row", async () => {
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

    const { getFinanceState } = require("./financeRepository");
    const state = await getFinanceState();
    expect(state.period).toBe("2026-09-10");
  });

  test("saveFinanceState() upserts scoped to the current user", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveFinanceState } = require("./financeRepository");
    await saveFinanceState(sampleState());

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.gop).toBe(500);
    expect(upserted.ebitda).toBe(400);
  });

  test("appendFinanceReport() inserts a new row", async () => {
    let inserted;
    const client = { from: () => ({ insert: (payload) => { inserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { appendFinanceReport } = require("./financeRepository");
    await appendFinanceReport(sampleState());

    expect(inserted.user_id).toBe("user-1");
    expect(inserted.gop).toBe(500);
  });

  test("saveFinanceForecast() upserts the forecast", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveFinanceForecast } = require("./financeRepository");
    await saveFinanceForecast({ horizonDays: 30, generatedAt: "2026-09-10" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.forecast.horizonDays).toBe(30);
  });
});

describe("financeRepository guest mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue(null);
    mockAssertSupabaseConfigured.mockImplementation(() => {
      throw new Error("guest mode must never reach assertSupabaseConfigured()");
    });
  });

  test("getFinanceState() returns null before anything has been saved", async () => {
    const { getFinanceState } = require("./financeRepository");
    await expect(getFinanceState()).resolves.toBeNull();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveFinanceState() persists to localStorage and getFinanceState() reads it back", async () => {
    const { getFinanceState, saveFinanceState } = require("./financeRepository");
    await saveFinanceState(sampleState());
    const reloaded = await getFinanceState();

    expect(reloaded.period).toBe("2026-09-10");
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("appendFinanceReport()/saveFinanceForecast() are no-ops that never throw or touch Supabase", async () => {
    const { appendFinanceReport, saveFinanceForecast } = require("./financeRepository");
    await expect(appendFinanceReport(sampleState())).resolves.toBeUndefined();
    await expect(saveFinanceForecast({ horizonDays: 30 })).resolves.toBeUndefined();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });
});
