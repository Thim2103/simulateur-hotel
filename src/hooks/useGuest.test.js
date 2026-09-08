import { renderHook, act } from "@testing-library/react";
import { useGuest } from "./useGuest";

beforeEach(() => {
  window.localStorage.clear();
});

test("createGuestSession creates and stores a new session", () => {
  const { result } = renderHook(() => useGuest());
  expect(result.current.isGuest()).toBe(false);

  act(() => result.current.createGuestSession());

  expect(result.current.isGuest()).toBe(true);
  expect(result.current.guestSession.user.id).toMatch(/^guest-/);
});

test("loadGuestSession picks up a session created in a previous render/session", () => {
  const first = renderHook(() => useGuest());
  act(() => first.result.current.createGuestSession());
  const guestId = first.result.current.guestSession.user.id;

  const second = renderHook(() => useGuest());
  expect(second.result.current.isGuest()).toBe(true);

  act(() => second.result.current.loadGuestSession());
  expect(second.result.current.guestSession.user.id).toBe(guestId);
});

test("saveGuestState/loadGuestState round-trip through a namespace", () => {
  const { result } = renderHook(() => useGuest());
  act(() => result.current.saveGuestState("career", { day: 2 }));
  expect(result.current.loadGuestState("career")).toEqual({ day: 2 });
});

test("resetGuestSession clears the session", () => {
  const { result } = renderHook(() => useGuest());
  act(() => result.current.createGuestSession());
  act(() => result.current.resetGuestSession());
  expect(result.current.isGuest()).toBe(false);
});

// Part C of the navigation fixes: Guest Mode is a session type, not a
// separate/restricted game mode. useGuest.js is deliberately a thin
// session manager -- it exposes no per-page or per-feature allowlist, so
// there is nothing here that could gate which pages a guest can reach;
// full navigation access is enforced by simply not existing as a
// concept, not by an explicit check this test could defeat. Real
// page-by-page reachability is covered by the navigationMenuFlow/
// navigationTopBarFlow integration tests.
test("exposes only session management -- no page or feature restriction API", () => {
  const { result } = renderHook(() => useGuest());
  const exposedKeys = Object.keys(result.current).sort();
  expect(exposedKeys).toEqual(
    ["createGuestSession", "guestSession", "isGuest", "loadGuestSession", "loadGuestState", "resetGuestSession", "saveGuestState"].sort()
  );
});
