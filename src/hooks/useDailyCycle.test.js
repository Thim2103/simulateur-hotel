import { act, renderHook, waitFor } from "@testing-library/react";
import { useDailyCycle } from "./useDailyCycle";

const mockRunDailyCycle = jest.fn();
const mockListRooms = jest.fn();
const mockListReservations = jest.fn();

jest.mock("../lib/dailyCycle", () => ({
  runDailyCycle: (...args) => mockRunDailyCycle(...args),
}));

jest.mock("../lib/pmsRepository", () => ({
  listRooms: (...args) => mockListRooms(...args),
  listReservations: (...args) => mockListReservations(...args),
}));

function sampleReport(overrides = {}) {
  return {
    date: "2026-09-10",
    hotelRevenue: { netRevenue: 500, occupiedRooms: 3 },
    restaurantRevenue: { netRevenue: 200 },
    expenses: { total: 300 },
    profit: 400,
    events: [],
    staffChanges: {},
    reservationsChanges: {},
    ...overrides,
  };
}

beforeEach(() => {
  mockRunDailyCycle.mockReset();
  mockListRooms.mockReset();
  mockListReservations.mockReset();
  mockListRooms.mockResolvedValue([{ id: 1 }]);
  mockListReservations.mockResolvedValue([{ id: 1 }]);
});

test("advanceDay() runs the pipeline and stores the resulting DailyReport", async () => {
  mockRunDailyCycle.mockResolvedValue(sampleReport());
  const { result } = renderHook(() => useDailyCycle());

  await act(async () => {
    await result.current.advanceDay();
  });

  expect(mockRunDailyCycle).toHaveBeenCalledTimes(1);
  expect(result.current.dailyReport).toEqual(sampleReport());
});

test("toggles isRunning for the duration of advanceDay() so the button can be disabled", async () => {
  let resolveRun;
  mockRunDailyCycle.mockReturnValue(new Promise((resolve) => { resolveRun = resolve; }));
  const { result } = renderHook(() => useDailyCycle());

  let advancePromise;
  act(() => {
    advancePromise = result.current.advanceDay();
  });
  expect(result.current.isRunning).toBe(true);

  await act(async () => {
    resolveRun(sampleReport());
    await advancePromise;
  });
  expect(result.current.isRunning).toBe(false);
});

test("ignores a second advanceDay() call while one is already running", async () => {
  let resolveRun;
  mockRunDailyCycle.mockReturnValue(new Promise((resolve) => { resolveRun = resolve; }));
  const { result } = renderHook(() => useDailyCycle());

  let first;
  act(() => {
    first = result.current.advanceDay();
  });
  await act(async () => {
    await result.current.advanceDay(); // should be a no-op (isRunning is already true)
  });

  expect(mockRunDailyCycle).toHaveBeenCalledTimes(1);

  await act(async () => {
    resolveRun(sampleReport());
    await first;
  });
});

test("refreshes the hotel and restaurant via the provided reload callbacks", async () => {
  mockRunDailyCycle.mockResolvedValue(sampleReport());
  const reloadHotel = jest.fn().mockResolvedValue(undefined);
  const reloadRestaurant = jest.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => useDailyCycle({ reloadHotel, reloadRestaurant }));

  await act(async () => {
    await result.current.advanceDay();
  });

  expect(reloadHotel).toHaveBeenCalledTimes(1);
  expect(reloadRestaurant).toHaveBeenCalledTimes(1);
});

test("refreshes PMS rooms/reservations after a successful run", async () => {
  mockRunDailyCycle.mockResolvedValue(sampleReport());
  const { result } = renderHook(() => useDailyCycle());

  await act(async () => {
    await result.current.advanceDay();
  });

  expect(mockListRooms).toHaveBeenCalled();
  expect(mockListReservations).toHaveBeenCalled();
  await waitFor(() => expect(result.current.rooms).toEqual([{ id: 1 }]));
  expect(result.current.reservations).toEqual([{ id: 1 }]);
});

test("does not crash the whole hook when a reload callback rejects", async () => {
  mockRunDailyCycle.mockResolvedValue(sampleReport());
  const reloadHotel = jest.fn().mockRejectedValue(new Error("network down"));
  const { result } = renderHook(() => useDailyCycle({ reloadHotel }));

  await act(async () => {
    await result.current.advanceDay();
  });

  // The report itself is still available even though a refresh failed.
  expect(result.current.dailyReport).toEqual(sampleReport());
});

test("surfaces an error from runDailyCycle() and clears isRunning", async () => {
  mockRunDailyCycle.mockRejectedValue(new Error("Session Supabase non authentifiee."));
  const { result } = renderHook(() => useDailyCycle());

  await act(async () => {
    await expect(result.current.advanceDay()).rejects.toThrow(/non authentifi/i);
  });

  expect(result.current.isRunning).toBe(false);
  expect(result.current.error).toBeInstanceOf(Error);
  expect(result.current.dailyReport).toBeNull();
});

test("dismissReport() clears the current report", async () => {
  mockRunDailyCycle.mockResolvedValue(sampleReport());
  const { result } = renderHook(() => useDailyCycle());

  await act(async () => {
    await result.current.advanceDay();
  });
  expect(result.current.dailyReport).not.toBeNull();

  act(() => {
    result.current.dismissReport();
  });
  expect(result.current.dailyReport).toBeNull();
});
