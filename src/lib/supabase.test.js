// .env.test blanks REACT_APP_SUPABASE_URL/_KEY so the rest of the suite runs
// fully offline (see .env.test) -- `supabase` is null and ensureAuthSession()
// short-circuits without calling resolveAuthSession() at all. To actually
// exercise that function's branches (reuse an existing session / sign in
// anonymously / handle a disabled provider) without making a real network
// call, this file overrides process.env itself and mocks the supabase-js
// client before (re-)requiring the module.
const mockGetSession = jest.fn();
const mockSignInAnonymously = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getSession: mockGetSession, signInAnonymously: mockSignInAnonymously } }),
}));

describe("ensureAuthSession / requireUserId", () => {
  const originalUrl = process.env.REACT_APP_SUPABASE_URL;
  const originalKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  beforeEach(() => {
    process.env.REACT_APP_SUPABASE_URL = "https://example.supabase.co";
    process.env.REACT_APP_SUPABASE_ANON_KEY = "test-anon-key";
    jest.resetModules();
    mockGetSession.mockReset();
    mockSignInAnonymously.mockReset();
  });

  afterAll(() => {
    process.env.REACT_APP_SUPABASE_URL = originalUrl;
    process.env.REACT_APP_SUPABASE_ANON_KEY = originalKey;
  });

  test("reuses an existing session instead of signing in again", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
    const { ensureAuthSession } = require("./supabase");

    await expect(ensureAuthSession()).resolves.toBe("user-1");
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });

  test("signs in anonymously when there is no existing session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignInAnonymously.mockResolvedValue({ data: { user: { id: "anon-1" } }, error: null });
    const { ensureAuthSession } = require("./supabase");

    await expect(ensureAuthSession()).resolves.toBe("anon-1");
  });

  test("resolves to null (never throws) when anonymous sign-in is unavailable", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignInAnonymously.mockResolvedValue({ data: null, error: new Error("Anonymous sign-ins are disabled") });
    const { ensureAuthSession } = require("./supabase");

    await expect(ensureAuthSession()).resolves.toBeNull();
  });
});

// The RLS policies added in supabase/migrations/202609070006_rls_user_scoping.sql
// only grant access `to authenticated` (using (user_id = auth.uid() or
// user_id is null)); anyone else is denied by default. That enforcement
// lives in Postgres and can't be exercised by a Jest unit test, but the
// app-level guard that stands in front of it can: requireUserId() must
// refuse to let a repository write with user_id: null instead of silently
// sending a request Postgres would reject anyway.
describe("requireUserId blocks unauthenticated writes", () => {
  test("rejects with a clear error when Supabase isn't configured at all", async () => {
    jest.resetModules();
    const { requireUserId } = require("./supabase");

    await expect(requireUserId()).rejects.toThrow(/non authentifi/i);
  });

  test("rejects with a clear error when the session can't be established", async () => {
    process.env.REACT_APP_SUPABASE_URL = "https://example.supabase.co";
    process.env.REACT_APP_SUPABASE_ANON_KEY = "test-anon-key";
    jest.resetModules();
    mockGetSession.mockReset();
    mockSignInAnonymously.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignInAnonymously.mockResolvedValue({ data: null, error: new Error("Anonymous sign-ins are disabled") });
    const { requireUserId } = require("./supabase");

    await expect(requireUserId()).rejects.toThrow(/non authentifi/i);
  });

  test("resolves the user id once a session is available", async () => {
    process.env.REACT_APP_SUPABASE_URL = "https://example.supabase.co";
    process.env.REACT_APP_SUPABASE_ANON_KEY = "test-anon-key";
    jest.resetModules();
    mockGetSession.mockReset();
    mockSignInAnonymously.mockReset();
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "user-2" } } }, error: null });
    const { requireUserId } = require("./supabase");

    await expect(requireUserId()).resolves.toBe("user-2");
  });
});
