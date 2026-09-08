// Separate from restaurantRepository.test.js (which only tests pure
// helpers and doesn't mock ./supabase) because getRestaurantState()/
// saveRestaurantState()'s guest branch needs ensureAuthSession() mocked
// to force the fallback, same approach as pmsRepository.test.js/
// hotelRepository.test.js.
const mockRequireUserId = jest.fn();
const mockEnsureAuthSession = jest.fn();
const mockAssertSupabaseConfigured = jest.fn();

jest.mock("./supabase", () => ({
  requireUserId: (...args) => mockRequireUserId(...args),
  ensureAuthSession: (...args) => mockEnsureAuthSession(...args),
  assertSupabaseConfigured: (...args) => mockAssertSupabaseConfigured(...args),
}));

beforeEach(() => {
  jest.resetModules();
  window.localStorage.clear();
  mockRequireUserId.mockReset();
  mockEnsureAuthSession.mockReset();
  mockAssertSupabaseConfigured.mockReset();
  // No Supabase session at all -> resolveSession() falls back to the
  // real (unmocked) lib/guest/guestSession.js; nothing here should ever
  // reach the (still-mocked) Supabase client.
  mockEnsureAuthSession.mockResolvedValue(null);
  mockAssertSupabaseConfigured.mockImplementation(() => {
    throw new Error("guest mode must never reach assertSupabaseConfigured()");
  });
});

describe("restaurantRepository guest mode", () => {
  test("getRestaurantState() seeds a ready-to-play restaurant, no Supabase call", async () => {
    const { getRestaurantState } = require("./restaurantRepository");
    const state = await getRestaurantState();

    expect(state.staff.length).toBeGreaterThan(0);
    expect(state.menu.length).toBeGreaterThan(0);
    expect(mockRequireUserId).not.toHaveBeenCalled();
  });

  test("saveRestaurantState() persists to localStorage and getRestaurantState() reads it back", async () => {
    const { getRestaurantState, saveRestaurantState } = require("./restaurantRepository");
    const seeded = await getRestaurantState();

    await saveRestaurantState({ ...seeded, marketing: { ...seeded.marketing, budget: 12345 } });
    const reloaded = await getRestaurantState();

    expect(reloaded.marketing.budget).toBe(12345);
  });

  test("shares the same guest namespace ('restaurant') useRestaurant.js's own guest bypass already uses", async () => {
    const { createGuestRepository } = require("./guest/guestRepository");
    const sharedRepository = createGuestRepository("restaurant", { defaultState: null });

    const { getRestaurantState, saveRestaurantState } = require("./restaurantRepository");
    await getRestaurantState(); // seeds it
    await saveRestaurantState({ marketing: { budget: 555 } });

    await expect(sharedRepository.get()).resolves.toEqual({ marketing: { budget: 555 } });
  });

  test("the seeded restaurant is shared across separate module loads (one localStorage document, not reseeded)", async () => {
    const { getRestaurantState: first } = require("./restaurantRepository");
    const seeded = await first();

    jest.resetModules();
    mockEnsureAuthSession.mockResolvedValue(null);
    const { getRestaurantState: second } = require("./restaurantRepository");
    const reloaded = await second();

    expect(reloaded.staff.length).toBe(seeded.staff.length);
  });
});
