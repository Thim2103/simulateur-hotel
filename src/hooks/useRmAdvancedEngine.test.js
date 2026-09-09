import { renderHook, act } from "@testing-library/react";
import { useRmAdvancedEngine } from "./useRmAdvancedEngine";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import rmAdvancedRepository from "../lib/rmAdvancedRepository";
import { createGuestHotelBundle } from "../lib/guest";

jest.mock("../context/CareerContext", () => ({ useCareerContext: jest.fn() }));
jest.mock("./useSupabaseSession");
jest.mock("../lib/rmAdvancedRepository", () => ({
  getRmAdvancedState: jest.fn(),
  saveRmAdvancedState: jest.fn(),
  saveRmAdvancedForecast: jest.fn(),
  saveRmAdvancedDiagnostics: jest.fn(),
}));

function careerFixture(overrides = {}) {
  return {
    playerId: "player-1",
    day: 1,
    hotel: createGuestHotelBundle({ referenceDate: new Date("2026-09-16T12:00:00Z") }),
    ...overrides,
  };
}

function careerContextFixture(overrides = {}) {
  return {
    careerState: careerFixture(),
    loadCareerState: jest.fn(),
    applyHotelAdjustment: jest.fn(async (updater) => {
      const state = careerFixture();
      return { ...state, hotel: updater(state.hotel) };
    }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  const session = { user: { id: "u1" }, mode: "supabase" };
  useSupabaseSession.mockReturnValue({ session, loading: false, isGuest: false, reload: jest.fn().mockResolvedValue(session) });
  useCareerContext.mockReturnValue(careerContextFixture());
  rmAdvancedRepository.getRmAdvancedState.mockResolvedValue(null);
  rmAdvancedRepository.saveRmAdvancedState.mockResolvedValue(undefined);
  rmAdvancedRepository.saveRmAdvancedForecast.mockResolvedValue(undefined);
  rmAdvancedRepository.saveRmAdvancedDiagnostics.mockResolvedValue(undefined);
});

test("loadRmAdvancedState computes and persists a fresh cycle when nothing was stored yet", async () => {
  const { result } = renderHook(() => useRmAdvancedEngine());

  await act(async () => {
    await result.current.loadRmAdvancedState();
  });

  expect(result.current.rmAdvancedState.compression).toBeDefined();
  expect(result.current.rmAdvancedState.cyclesElapsed).toBe(1);
  expect(rmAdvancedRepository.saveRmAdvancedState).toHaveBeenCalled();
});

test("loadRmAdvancedState reuses the stored state when Career hasn't played a new day", async () => {
  const stored = { cyclesElapsed: 1, compression: { avgCompression: 60 } };
  rmAdvancedRepository.getRmAdvancedState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 1 }) }));

  const { result } = renderHook(() => useRmAdvancedEngine());
  await act(async () => {
    await result.current.loadRmAdvancedState();
  });

  expect(result.current.rmAdvancedState).toBe(stored);
  expect(rmAdvancedRepository.saveRmAdvancedState).not.toHaveBeenCalled();
});

test("loadRmAdvancedState recomputes when Career's day counter has advanced past the stored cycle", async () => {
  const stored = { cyclesElapsed: 1, compression: { avgCompression: 60 } };
  rmAdvancedRepository.getRmAdvancedState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 2 }) }));

  const { result } = renderHook(() => useRmAdvancedEngine());
  await act(async () => {
    await result.current.loadRmAdvancedState();
  });

  expect(result.current.rmAdvancedState.cyclesElapsed).toBe(2);
  expect(rmAdvancedRepository.saveRmAdvancedState).toHaveBeenCalled();
});

test("loadRmAdvancedState does nothing when there is no career/hotel bundle yet", async () => {
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) }));

  const { result } = renderHook(() => useRmAdvancedEngine());
  await act(async () => {
    await result.current.loadRmAdvancedState();
  });

  expect(result.current.rmAdvancedState).toBeNull();
  expect(rmAdvancedRepository.getRmAdvancedState).not.toHaveBeenCalled();
  expect(rmAdvancedRepository.saveRmAdvancedState).not.toHaveBeenCalled();
});

test("loadRmAdvancedState loads Career first when it hasn't been loaded yet", async () => {
  const loadCareerState = jest.fn().mockResolvedValue(careerFixture());
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState }));

  const { result } = renderHook(() => useRmAdvancedEngine());
  await act(async () => {
    await result.current.loadRmAdvancedState();
  });

  expect(loadCareerState).toHaveBeenCalled();
  expect(result.current.rmAdvancedState).not.toBeNull();
});

test("applyRmAdvancedAction runs the decision through Career's applyHotelAdjustment and recomputes the cycle", async () => {
  const applyHotelAdjustment = jest.fn(async (updater) => {
    const state = careerFixture();
    return { ...state, hotel: updater(state.hotel) };
  });
  useCareerContext.mockReturnValue(careerContextFixture({ applyHotelAdjustment }));

  const { result } = renderHook(() => useRmAdvancedEngine());
  await act(async () => {
    await result.current.loadRmAdvancedState();
  });
  await act(async () => {
    await result.current.applyRmAdvancedAction("augmenter-adr");
  });

  expect(applyHotelAdjustment).toHaveBeenCalled();
  expect(rmAdvancedRepository.saveRmAdvancedState).toHaveBeenCalled();
});

test("getRmAdvancedForecast/getCompression/getDisplacement/getPickupCurves/getOtaStrategy/getSpecialPricing/getRmAdvancedDiagnostics/getRmAdvancedReport all work", async () => {
  const { result } = renderHook(() => useRmAdvancedEngine());
  await act(async () => {
    await result.current.loadRmAdvancedState();
  });

  expect(result.current.getRmAdvancedForecast()?.scenarios).toBeDefined();
  expect(result.current.getCompression()?.byDate).toBeDefined();
  expect(result.current.getDisplacement()?.bySegment).toBeDefined();
  expect(result.current.getPickupCurves()?.curve).toBeDefined();
  expect(result.current.getOtaStrategy()?.channels).toBeDefined();
  expect(result.current.getSpecialPricing()?.events).toBeDefined();
  expect(Array.isArray(result.current.getRmAdvancedDiagnostics())).toBe(true);
  expect(result.current.getRmAdvancedReport()?.replay).toBeDefined();
});

describe("guest mode", () => {
  beforeEach(() => {
    const guestSession = { user: { id: "guest-1" }, mode: "guest" };
    useSupabaseSession.mockReturnValue({ session: guestSession, loading: false, isGuest: true, reload: jest.fn().mockResolvedValue(guestSession) });
  });

  test("loadRmAdvancedState works end to end in guest mode", async () => {
    const { result } = renderHook(() => useRmAdvancedEngine());
    await act(async () => {
      await result.current.loadRmAdvancedState();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.rmAdvancedState.compression).toBeDefined();
  });
});
