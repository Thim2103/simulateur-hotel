import { act, renderHook, waitFor } from "@testing-library/react";
import { useSupabaseSession } from "./useSupabaseSession";
import { ensureAuthSession } from "../lib/supabase";

jest.mock("../lib/supabase", () => ({ ensureAuthSession: jest.fn() }));

beforeEach(() => {
  window.localStorage.clear();
  ensureAuthSession.mockReset();
});

test("resolves to a Supabase session when ensureAuthSession() returns a real user id", async () => {
  ensureAuthSession.mockResolvedValue("real-user-id");
  const { result } = renderHook(() => useSupabaseSession());

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.session).toEqual({ user: { id: "real-user-id" }, mode: "supabase" });
  expect(result.current.isGuest).toBe(false);
});

test("falls back to a local guest session when ensureAuthSession() resolves to null", async () => {
  ensureAuthSession.mockResolvedValue(null);
  const { result } = renderHook(() => useSupabaseSession());

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.isGuest).toBe(true);
  expect(result.current.session.user.id).toMatch(/^guest-/);
});

test("falls back to a guest session instead of leaving the app stuck when ensureAuthSession() unexpectedly throws", async () => {
  ensureAuthSession.mockRejectedValue(new Error("boom"));
  const { result } = renderHook(() => useSupabaseSession());

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.isGuest).toBe(true);
});

// Part C of the navigation fixes: Guest Mode is a session type, not a
// degraded/error state -- the hook never exposes an `error` field for the
// guest fallback, so no page built on top of it can accidentally render a
// Supabase connection error while merely running as a guest.
test("the guest fallback never surfaces a Supabase error to the UI", async () => {
  ensureAuthSession.mockResolvedValue(null);
  const { result } = renderHook(() => useSupabaseSession());

  await waitFor(() => expect(result.current.loading).toBe(false));

  expect(result.current.error).toBeUndefined();
  expect(result.current.isGuest).toBe(true);
  expect(result.current.session.mode).toBe("guest");
});

test("reuses the same guest session across reloads instead of creating a new guest each time", async () => {
  ensureAuthSession.mockResolvedValue(null);
  const { result } = renderHook(() => useSupabaseSession());
  await waitFor(() => expect(result.current.loading).toBe(false));
  const firstGuestId = result.current.session.user.id;

  await act(async () => {
    await result.current.reload();
  });

  expect(result.current.session.user.id).toBe(firstGuestId);
});
