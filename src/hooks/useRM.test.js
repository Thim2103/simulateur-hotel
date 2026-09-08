import { act, renderHook } from "@testing-library/react";
import { useRM } from "./useRM";

// useRM.js itself has no Supabase-vs-guest branch to test: it only ever
// calls listRooms()/listReservations() from lib/pmsRepository.js (mocked
// away below), which is where that branching now lives (see
// pmsRepository.test.js's "guest mode" describe block for that unit
// coverage, and navigationTopBarGuestFlow.integration.test.jsx's RM step
// for the real, unmocked end-to-end proof that /rm-dashboard works as a
// guest with zero Supabase errors).

const mockRunRMEngine = jest.fn();
const mockListRooms = jest.fn();
const mockListReservations = jest.fn();

jest.mock("../lib/rm", () => ({
  runRM: (...args) => mockRunRMEngine(...args),
}));

jest.mock("../lib/pmsRepository", () => ({
  listRooms: (...args) => mockListRooms(...args),
  listReservations: (...args) => mockListReservations(...args),
}));

function sampleReport(overrides = {}) {
  return {
    date: "2026-09-10",
    forecast: { next7: 700, next30: 3000, next90: 9000 },
    pickup: { daily: {}, bySegment: {}, byChannel: {} },
    pricing: { recommendedADR: 150, minPrice: 100, maxPrice: 220, eventAdjustment: 0, weatherAdjustment: 0, occupancyAdjustment: 0 },
    segmentation: { mix: {}, adrBySegment: {}, pickupBySegment: {} },
    recommendations: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockRunRMEngine.mockReset();
  mockListRooms.mockReset();
  mockListReservations.mockReset();
  mockListRooms.mockResolvedValue([{ id: 1 }]);
  mockListReservations.mockResolvedValue([{ id: 1 }]);
});

test("runRM() loads rooms/reservations, runs the engine, and stores the report", async () => {
  mockRunRMEngine.mockReturnValue(sampleReport());
  const { result } = renderHook(() => useRM());

  await act(async () => {
    await result.current.runRM();
  });

  expect(mockListRooms).toHaveBeenCalledTimes(1);
  expect(mockListReservations).toHaveBeenCalledTimes(1);
  expect(mockRunRMEngine).toHaveBeenCalledWith(expect.objectContaining({ rooms: [{ id: 1 }], reservations: [{ id: 1 }] }));
  expect(result.current.rmReport).toEqual(sampleReport());
});

test("passes overrides (e.g. explicit rooms/reservations) straight through to the engine", async () => {
  mockRunRMEngine.mockReturnValue(sampleReport());
  const { result } = renderHook(() => useRM());

  await act(async () => {
    await result.current.runRM({ rooms: [{ id: 42 }], reservations: [], activeEvents: [{ id: "weather" }] });
  });

  expect(mockListRooms).not.toHaveBeenCalled();
  expect(mockRunRMEngine).toHaveBeenCalledWith(expect.objectContaining({ rooms: [{ id: 42 }], reservations: [], activeEvents: [{ id: "weather" }] }));
});

test("toggles isRunning for the duration of the run", async () => {
  let resolveRooms;
  mockListRooms.mockReturnValue(new Promise((resolve) => { resolveRooms = resolve; }));
  mockRunRMEngine.mockReturnValue(sampleReport());
  const { result } = renderHook(() => useRM());

  let runPromise;
  act(() => {
    runPromise = result.current.runRM();
  });
  expect(result.current.isRunning).toBe(true);

  await act(async () => {
    resolveRooms([{ id: 1 }]);
    await runPromise;
  });
  expect(result.current.isRunning).toBe(false);
});

test("surfaces and rethrows an error from the engine, and clears isRunning", async () => {
  mockRunRMEngine.mockImplementation(() => { throw new Error("bad state"); });
  const { result } = renderHook(() => useRM());

  await act(async () => {
    await expect(result.current.runRM()).rejects.toThrow("bad state");
  });

  expect(result.current.isRunning).toBe(false);
  expect(result.current.error).toBeInstanceOf(Error);
  expect(result.current.rmReport).toBeNull();
});
