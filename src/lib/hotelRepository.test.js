// Mocks ./supabase only, same approach as pmsRepository.test.js: exercises
// hotelRepository.js's own branching logic (Supabase vs guest) without a
// real network call.
const mockRequireUserId = jest.fn();
const mockEnsureAuthSession = jest.fn();
const mockAssertSupabaseConfigured = jest.fn();

jest.mock("./supabase", () => ({
  requireUserId: (...args) => mockRequireUserId(...args),
  ensureAuthSession: (...args) => mockEnsureAuthSession(...args),
  assertSupabaseConfigured: (...args) => mockAssertSupabaseConfigured(...args),
}));

function createFakeClient(rows) {
  const calls = [];
  const client = {
    from(table) {
      return {
        select: () => {
          calls.push({ table, op: "select" });
          const query = {
            eq: () => query,
            limit: () => Promise.resolve({ data: rows, error: null }),
          };
          return query;
        },
        update: (payload) => {
          calls.push({ table, op: "update", payload });
          rows[0] = { ...rows[0], ...payload };
          return { eq: () => Promise.resolve({ data: null, error: null }) };
        },
        insert: (payload) => {
          calls.push({ table, op: "insert", payload });
          const query = { select: () => Promise.resolve({ data: [{ id: "new-1", ...payload }], error: null }) };
          return query;
        },
      };
    },
  };
  return { client, calls };
}

beforeEach(() => {
  jest.resetModules();
  window.localStorage.clear();
  mockRequireUserId.mockReset();
  mockEnsureAuthSession.mockReset();
  mockAssertSupabaseConfigured.mockReset();
});

describe("hotelRepository Supabase mode", () => {
  test("getHotelState() reads the caller's own hotel row", async () => {
    const { client } = createFakeClient([
      { structure: { name: "Hôtel Test" }, finance: {}, marketing: {}, esg: {}, expansion: {}, progression: {} },
    ]);
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { getHotelState } = require("./hotelRepository");
    const state = await getHotelState();

    expect(state.structure.name).toBe("Hôtel Test");
  });

  test("saveHotelState() updates the existing row for this user", async () => {
    const { client, calls } = createFakeClient([{ structure: {}, finance: {}, marketing: {}, esg: {}, expansion: {}, progression: {} }]);
    mockEnsureAuthSession.mockResolvedValue("user-1");
    mockRequireUserId.mockResolvedValue("user-1");
    mockAssertSupabaseConfigured.mockReturnValue(client);

    const { saveHotelState } = require("./hotelRepository");
    await saveHotelState({ structure: { name: "Nouveau nom" } });

    const updateCall = calls.find((call) => call.op === "update" && call.table === "hotels");
    expect(updateCall.payload.structure.name).toBe("Nouveau nom");
  });
});

describe("hotelRepository guest mode", () => {
  beforeEach(() => {
    mockEnsureAuthSession.mockResolvedValue(null);
    mockAssertSupabaseConfigured.mockImplementation(() => {
      throw new Error("guest mode must never reach assertSupabaseConfigured()");
    });
  });

  test("getHotelState() seeds a ready-to-play hotel (marketing/esg/finance already populated), no Supabase call", async () => {
    const { getHotelState } = require("./hotelRepository");
    const state = await getHotelState();

    expect(state.marketing).toBeDefined();
    expect(state.esg).toBeDefined();
    expect(state.finance).toBeDefined();
  });

  test("saveHotelState() persists to localStorage and getHotelState() reads it back, without touching requireUserId()", async () => {
    const { getHotelState, saveHotelState } = require("./hotelRepository");
    const seeded = await getHotelState();

    await saveHotelState({ ...seeded, marketing: { ...seeded.marketing, budget: 9999 } });
    const reloaded = await getHotelState();

    expect(reloaded.marketing.budget).toBe(9999);
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("the seeded hotel is shared across separate module loads (one localStorage document, not reseeded)", async () => {
    const { getHotelState: first } = require("./hotelRepository");
    const seeded = await first();

    jest.resetModules();
    mockEnsureAuthSession.mockResolvedValue(null);
    const { getHotelState: second } = require("./hotelRepository");
    const reloaded = await second();

    expect(reloaded.marketing.budget).toBe(seeded.marketing.budget);
  });
});
