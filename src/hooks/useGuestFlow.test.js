import { renderHook, act } from "@testing-library/react";
import { useGuestFlow } from "./useGuestFlow";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("starts with no review, a neutral attractiveness and no guest", () => {
  const { result } = renderHook(() => useGuestFlow({ day: 1, totalRooms: 10 }));
  expect(result.current).toMatchObject({ averageRating: null, reviewCount: 0, attractiveness: 1, rejectedCount: 0, welcomedCount: 0 });
});

test("welcomes arriving guests over time and refreshes the profile distribution", () => {
  const { result } = renderHook(() => useGuestFlow({ day: 1, totalRooms: 50, roomPrice: 1 }));
  act(() => { vi.advanceTimersByTime(60000); });
  expect(result.current.welcomedCount).toBeGreaterThan(0);
  const total = result.current.profileDistribution.reduce((sum, { count }) => sum + count, 0);
  expect(total).toBe(result.current.welcomedCount);
});

test("counts guests refusing a room priced above their budget", () => {
  const { result } = renderHook(() => useGuestFlow({ day: 1, totalRooms: 50, roomPrice: 10000 }));
  act(() => { vi.advanceTimersByTime(60000); });
  expect(result.current.rejectedCount).toBeGreaterThan(0);
  expect(result.current.welcomedCount).toBe(0);
});

test("advancing the day checks guests out and publishes their average rating", () => {
  const { result, rerender } = renderHook(({ day }) => useGuestFlow({ day, totalRooms: 50, roomPrice: 1 }), { initialProps: { day: 1 } });
  act(() => { vi.advanceTimersByTime(30000); });
  expect(result.current.welcomedCount).toBeGreaterThan(0);

  // Séjours de 7 nuits au plus : une semaine suffit à faire partir tout le monde.
  for (let day = 2; day <= 8; day += 1) rerender({ day });
  expect(result.current.reviewCount).toBeGreaterThan(0);
  expect(result.current.averageRating).toBeGreaterThanOrEqual(1);
  expect(result.current.averageRating).toBeLessThanOrEqual(5);
});

test("stops spawning guests once unmounted", () => {
  const { result, unmount } = renderHook(() => useGuestFlow({ day: 1, totalRooms: 50, roomPrice: 1 }));
  unmount();
  act(() => { vi.advanceTimersByTime(60000); });
  expect(result.current.welcomedCount).toBe(0);
});
