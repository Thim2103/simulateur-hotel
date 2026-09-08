const mockGetSession = jest.fn();
const mockSignInAnonymously = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getSession: mockGetSession, signInAnonymously: mockSignInAnonymously } }),
}));

describe("resolveSession / isGuestSession", () => {
  const originalUrl = process.env.REACT_APP_SUPABASE_URL;
  const originalKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  beforeEach(() => {
    process.env.REACT_APP_SUPABASE_URL = "https://example.supabase.co";
    process.env.REACT_APP_SUPABASE_ANON_KEY = "test-anon-key";
    jest.resetModules();
    mockGetSession.mockReset();
    mockSignInAnonymously.mockReset();
    window.localStorage.clear();
  });

  afterAll(() => {
    process.env.REACT_APP_SUPABASE_URL = originalUrl;
    process.env.REACT_APP_SUPABASE_ANON_KEY = originalKey;
  });

  test("resolves to a Supabase session when a real session is available", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
    const { resolveSession, isGuestSession } = require("./sessionResolver");

    await expect(resolveSession()).resolves.toEqual({ user: { id: "user-1" }, mode: "supabase" });
    await expect(isGuestSession()).resolves.toBe(false);
  });

  test("falls back to a guest session when there is no Supabase session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignInAnonymously.mockResolvedValue({ data: null, error: new Error("Anonymous sign-ins are disabled") });
    const { resolveSession, isGuestSession } = require("./sessionResolver");

    const session = await resolveSession();
    expect(session.mode).toBe("guest");
    expect(session.user.id).toMatch(/^guest-/);
    await expect(isGuestSession()).resolves.toBe(true);
  });

  test("reuses the same guest session across calls instead of creating a new one each time", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignInAnonymously.mockResolvedValue({ data: null, error: new Error("disabled") });
    const { resolveSession } = require("./sessionResolver");

    const first = await resolveSession();
    const second = await resolveSession();
    expect(second.user.id).toBe(first.user.id);
  });

  test("without Supabase configured at all, resolves straight to a guest session", async () => {
    delete process.env.REACT_APP_SUPABASE_URL;
    delete process.env.REACT_APP_SUPABASE_ANON_KEY;
    jest.resetModules();
    const { resolveSession } = require("./sessionResolver");

    const session = await resolveSession();
    expect(session.mode).toBe("guest");
  });
});
