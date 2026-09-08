// Same approach as supabase.test.js: .env.test blanks the Supabase env
// vars, so this file sets them itself and mocks supabase-js before
// (re-)requiring the module under test.
const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { signUp: mockSignUp, signInWithPassword: mockSignInWithPassword, signOut: mockSignOut } }),
}));

describe("auth.js", () => {
  const originalUrl = process.env.REACT_APP_SUPABASE_URL;
  const originalKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  beforeEach(() => {
    process.env.REACT_APP_SUPABASE_URL = "https://example.supabase.co";
    process.env.REACT_APP_SUPABASE_ANON_KEY = "test-anon-key";
    jest.resetModules();
    mockSignUp.mockReset();
    mockSignInWithPassword.mockReset();
    mockSignOut.mockReset();
  });

  afterAll(() => {
    process.env.REACT_APP_SUPABASE_URL = originalUrl;
    process.env.REACT_APP_SUPABASE_ANON_KEY = originalKey;
  });

  test("signUpWithPassword returns the new session when email confirmation is disabled", async () => {
    mockSignUp.mockResolvedValue({ data: { session: { access_token: "t" }, user: { id: "u1" } }, error: null });
    const { signUpWithPassword } = require("./auth");

    const result = await signUpWithPassword("a@b.com", "hunter22");
    expect(mockSignUp).toHaveBeenCalledWith({ email: "a@b.com", password: "hunter22" });
    expect(result.session.access_token).toBe("t");
    expect(result.user.id).toBe("u1");
  });

  test("signUpWithPassword returns a null session when email confirmation is required", async () => {
    mockSignUp.mockResolvedValue({ data: { session: null, user: { id: "u1" } }, error: null });
    const { signUpWithPassword } = require("./auth");

    const result = await signUpWithPassword("a@b.com", "hunter22");
    expect(result.session).toBeNull();
  });

  test("signUpWithPassword throws Supabase's own error", async () => {
    mockSignUp.mockResolvedValue({ data: null, error: new Error("Email already registered") });
    const { signUpWithPassword } = require("./auth");

    await expect(signUpWithPassword("a@b.com", "hunter22")).rejects.toThrow("Email already registered");
  });

  test("signInWithPassword returns the session on success", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { session: { access_token: "t" }, user: { id: "u1" } }, error: null });
    const { signInWithPassword } = require("./auth");

    const result = await signInWithPassword("a@b.com", "hunter22");
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "hunter22" });
    expect(result.session.access_token).toBe("t");
  });

  test("signInWithPassword throws on invalid credentials", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: null, error: new Error("Invalid login credentials") });
    const { signInWithPassword } = require("./auth");

    await expect(signInWithPassword("a@b.com", "wrong")).rejects.toThrow("Invalid login credentials");
  });

  test("signOut resolves on success and throws on failure", async () => {
    mockSignOut.mockResolvedValue({ error: null });
    const { signOut } = require("./auth");
    await expect(signOut()).resolves.toBeUndefined();

    mockSignOut.mockResolvedValue({ error: new Error("network error") });
    await expect(signOut()).rejects.toThrow("network error");
  });

  test("throws a clear error when Supabase isn't configured", async () => {
    delete process.env.REACT_APP_SUPABASE_URL;
    delete process.env.REACT_APP_SUPABASE_ANON_KEY;
    jest.resetModules();
    const { signInWithPassword } = require("./auth");

    await expect(signInWithPassword("a@b.com", "hunter22")).rejects.toThrow(/pas configure/i);
  });
});
