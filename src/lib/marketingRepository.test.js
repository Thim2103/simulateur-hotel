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
    budget: { channel: 4000, campaign: 3000, total: 7000 },
    roi: { campaignsAvgRoi: 2.1, overallRoi: 2.1, generatedRevenue: 6300 },
    conversion: { totalReach: 200, estimatedLeads: 120, conversionRate: 15 },
    reputation: 68,
    segments: { counts: { business: 1 }, revenue: {}, mixShare: {} },
    channels: [{ id: "ota", name: "OTA", enabled: true, budget: 2200, reach: 68, roi: 1.5, costPerLead: 3 }],
    campaigns: [{ id: 1, name: "Été", objective: "Acquisition", status: "active", budget: 3000, conversion: 7, roi: 2.1, demandUplift: 6 }],
    forecast: { horizonDays: 30 },
    diagnostics: [],
    cyclesElapsed: 1,
    positioningTier: "upscale",
  };
}

beforeEach(() => {
  jest.resetModules();
  window.localStorage.clear();
  mockRequireUserId.mockReset();
  mockEnsureAuthSession.mockReset();
  mockAssertSupabaseConfigured.mockReset();
});

describe("marketingRepository Supabase mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockRequireUserId.mockResolvedValue("user-1");
  });

  test("getMarketingState() reads the caller's own row", async () => {
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

    const { getMarketingState } = require("./marketingRepository");
    const state = await getMarketingState();
    expect(state.period).toBe("2026-09-10");
  });

  test("saveMarketingState() upserts scoped to the current user", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveMarketingState } = require("./marketingRepository");
    await saveMarketingState(sampleState());

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.reputation).toBe(68);
    expect(upserted.budget.total).toBe(7000);
  });

  test("saveMarketingCampaigns() upserts one row per campaign", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveMarketingCampaigns } = require("./marketingRepository");
    await saveMarketingCampaigns(sampleState().campaigns);

    expect(upserted).toHaveLength(1);
    expect(upserted[0].user_id).toBe("user-1");
    expect(upserted[0].campaign_id).toBe("1");
  });

  test("saveMarketingChannels() upserts one row per channel", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveMarketingChannels } = require("./marketingRepository");
    await saveMarketingChannels(sampleState().channels);

    expect(upserted).toHaveLength(1);
    expect(upserted[0].channel_id).toBe("ota");
  });

  test("saveMarketingForecast() upserts the forecast", async () => {
    let upserted;
    const client = { from: () => ({ upsert: (payload) => { upserted = payload; return Promise.resolve({ error: null }); } }) };
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveMarketingForecast } = require("./marketingRepository");
    await saveMarketingForecast({ horizonDays: 30, generatedAt: "2026-09-10" });

    expect(upserted.user_id).toBe("user-1");
    expect(upserted.forecast.horizonDays).toBe(30);
  });
});

describe("marketingRepository guest mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue(null);
    mockAssertSupabaseConfigured.mockImplementation(() => {
      throw new Error("guest mode must never reach assertSupabaseConfigured()");
    });
  });

  test("getMarketingState() returns null before anything has been saved", async () => {
    const { getMarketingState } = require("./marketingRepository");
    await expect(getMarketingState()).resolves.toBeNull();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveMarketingState() persists to localStorage and getMarketingState() reads it back", async () => {
    const { getMarketingState, saveMarketingState } = require("./marketingRepository");
    await saveMarketingState(sampleState());
    const reloaded = await getMarketingState();

    expect(reloaded.period).toBe("2026-09-10");
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveMarketingCampaigns()/saveMarketingChannels()/saveMarketingForecast() are no-ops that never throw or touch Supabase", async () => {
    const { saveMarketingCampaigns, saveMarketingChannels, saveMarketingForecast } = require("./marketingRepository");
    await expect(saveMarketingCampaigns(sampleState().campaigns)).resolves.toBeUndefined();
    await expect(saveMarketingChannels(sampleState().channels)).resolves.toBeUndefined();
    await expect(saveMarketingForecast({ horizonDays: 30 })).resolves.toBeUndefined();
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });
});
