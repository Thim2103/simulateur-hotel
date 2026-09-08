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
