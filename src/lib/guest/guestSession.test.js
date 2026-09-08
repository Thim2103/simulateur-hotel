import { createGuestSession, ensureGuestSession, isGuestSession, loadGuestSession, resetGuestSession } from "./guestSession";

beforeEach(() => {
  window.localStorage.clear();
});

test("createGuestSession generates a stable-looking guest id and persists the session", () => {
  const session = createGuestSession();
  expect(session.user.id).toMatch(/^guest-/);
  expect(session.mode).toBe("guest");
  expect(loadGuestSession()).toEqual(session);
});

test("loadGuestSession returns null when no session exists yet", () => {
  expect(loadGuestSession()).toBeNull();
});

test("ensureGuestSession reuses an existing session instead of creating a new one", () => {
  const first = createGuestSession();
  const second = ensureGuestSession();
  expect(second).toEqual(first);
});

test("ensureGuestSession creates one when none exists", () => {
  expect(loadGuestSession()).toBeNull();
  const session = ensureGuestSession();
  expect(session.user.id).toMatch(/^guest-/);
});

test("resetGuestSession clears the persisted session", () => {
  createGuestSession();
  resetGuestSession();
  expect(loadGuestSession()).toBeNull();
});

test("isGuestSession identifies a guest session and rejects everything else", () => {
  expect(isGuestSession(createGuestSession())).toBe(true);
  expect(isGuestSession({ user: { id: "u1" }, mode: "supabase" })).toBe(false);
  expect(isGuestSession(null)).toBe(false);
});
