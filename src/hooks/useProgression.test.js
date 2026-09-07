import { act, renderHook } from "@testing-library/react";
import { useProgression } from "./useProgression";

const mockRunProgressionEngine = jest.fn();
const mockGetHotelState = jest.fn();
const mockGetRestaurantState = jest.fn();
const mockListRooms = jest.fn();

jest.mock("../lib/progression", () => ({
  runProgression: (...args) => mockRunProgressionEngine(...args),
}));

jest.mock("../lib/hotelRepository", () => ({
  getHotelState: (...args) => mockGetHotelState(...args),
}));

jest.mock("../lib/restaurantRepository", () => ({
  getRestaurantState: (...args) => mockGetRestaurantState(...args),
}));

jest.mock("../lib/pmsRepository", () => ({
  listRooms: (...args) => mockListRooms(...args),
}));

function sampleReport(overrides = {}) {
  return {
    reputation: 70,
    xp: 120,
    level: { level: 2, title: "Gérant confirmé", xp: 120, xpForNextLevel: 300, xpToNextLevel: 180, progress: 10 },
    objectivesCompleted: [],
    newAchievements: [],
    rewards: [],
    storylineEvents: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockRunProgressionEngine.mockReset();
  mockGetHotelState.mockReset();
  mockGetRestaurantState.mockReset();
  mockListRooms.mockReset();
  mockGetHotelState.mockResolvedValue({ progression: {} });
  mockGetRestaurantState.mockResolvedValue({ staff: [] });
  mockListRooms.mockResolvedValue([]);
});

test("updateProgression() loads hotel/restaurant/room state, runs the engine, and stores the report", async () => {
  mockRunProgressionEngine.mockReturnValue({ report: sampleReport(), player: {}, cycles: 1 });
  const { result } = renderHook(() => useProgression());

  await act(async () => {
    await result.current.updateProgression();
  });

  expect(mockGetHotelState).toHaveBeenCalledTimes(1);
  expect(mockGetRestaurantState).toHaveBeenCalledTimes(1);
  expect(mockListRooms).toHaveBeenCalledTimes(1);
  expect(result.current.progressionReport).toEqual(sampleReport());
});

test("passes explicit overrides straight through instead of loading them", async () => {
  mockRunProgressionEngine.mockReturnValue({ report: sampleReport(), player: {}, cycles: 1 });
  const { result } = renderHook(() => useProgression());

  await act(async () => {
    await result.current.updateProgression({ hotelState: { id: "h1" }, restaurantState: { id: "r1" }, rooms: [{ id: 1 }] });
  });

  expect(mockGetHotelState).not.toHaveBeenCalled();
  expect(mockRunProgressionEngine).toHaveBeenCalledWith(
    expect.objectContaining({ hotelState: { id: "h1" }, restaurantState: { id: "r1" }, rooms: [{ id: 1 }] })
  );
});

test("toggles isRunning for the duration of the run", async () => {
  let resolveHotel;
  mockGetHotelState.mockReturnValue(new Promise((resolve) => { resolveHotel = resolve; }));
  mockRunProgressionEngine.mockReturnValue({ report: sampleReport(), player: {}, cycles: 1 });
  const { result } = renderHook(() => useProgression());

  let runPromise;
  act(() => {
    runPromise = result.current.updateProgression();
  });
  expect(result.current.isRunning).toBe(true);

  await act(async () => {
    resolveHotel({ progression: {} });
    await runPromise;
  });
  expect(result.current.isRunning).toBe(false);
});

test("surfaces and rethrows an error, and clears isRunning", async () => {
  mockRunProgressionEngine.mockImplementation(() => { throw new Error("bad state"); });
  const { result } = renderHook(() => useProgression());

  await act(async () => {
    await expect(result.current.updateProgression()).rejects.toThrow("bad state");
  });

  expect(result.current.isRunning).toBe(false);
  expect(result.current.error).toBeInstanceOf(Error);
  expect(result.current.progressionReport).toBeNull();
});
