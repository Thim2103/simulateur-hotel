import { renderHook, act } from "@testing-library/react";
import { useRestaurantAdvanced } from "./useRestaurantAdvanced";
import { useCareerContext } from "../context/CareerContext";
import { useSupabaseSession } from "./useSupabaseSession";
import restaurantAdvancedRepository from "../lib/restaurantAdvancedRepository";
import { createGuestHotelBundle } from "../lib/guest";

jest.mock("../context/CareerContext", () => ({ useCareerContext: jest.fn() }));
jest.mock("./useSupabaseSession");
jest.mock("../lib/restaurantAdvancedRepository", () => ({
  getRestaurantAdvancedState: jest.fn(),
  saveRestaurantAdvancedState: jest.fn(),
  saveRestaurantAdvancedForecast: jest.fn(),
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
  restaurantAdvancedRepository.getRestaurantAdvancedState.mockResolvedValue(null);
  restaurantAdvancedRepository.saveRestaurantAdvancedState.mockResolvedValue(undefined);
  restaurantAdvancedRepository.saveRestaurantAdvancedForecast.mockResolvedValue(undefined);
});

test("loadRestaurantAdvancedState computes and persists a fresh cycle when nothing was stored yet", async () => {
  const { result } = renderHook(() => useRestaurantAdvanced());

  await act(async () => {
    await result.current.loadRestaurantAdvancedState();
  });

  expect(result.current.restaurantAdvancedState.foodCost).toBeDefined();
  expect(result.current.restaurantAdvancedState.cyclesElapsed).toBe(1);
  expect(restaurantAdvancedRepository.saveRestaurantAdvancedState).toHaveBeenCalled();
});

test("loadRestaurantAdvancedState reuses the stored state when Career hasn't played a new day", async () => {
  const stored = { cyclesElapsed: 1, foodCost: { overall: 30 } };
  restaurantAdvancedRepository.getRestaurantAdvancedState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 1 }) }));

  const { result } = renderHook(() => useRestaurantAdvanced());
  await act(async () => {
    await result.current.loadRestaurantAdvancedState();
  });

  expect(result.current.restaurantAdvancedState).toBe(stored);
  expect(restaurantAdvancedRepository.saveRestaurantAdvancedState).not.toHaveBeenCalled();
});

test("loadRestaurantAdvancedState recomputes when Career's day counter has advanced past the stored cycle", async () => {
  const stored = { cyclesElapsed: 1, foodCost: { overall: 30 } };
  restaurantAdvancedRepository.getRestaurantAdvancedState.mockResolvedValue(stored);
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: careerFixture({ day: 2 }) }));

  const { result } = renderHook(() => useRestaurantAdvanced());
  await act(async () => {
    await result.current.loadRestaurantAdvancedState();
  });

  expect(result.current.restaurantAdvancedState.cyclesElapsed).toBe(2);
  expect(restaurantAdvancedRepository.saveRestaurantAdvancedState).toHaveBeenCalled();
});

test("loadRestaurantAdvancedState does nothing when there is no career/hotel bundle yet", async () => {
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) }));

  const { result } = renderHook(() => useRestaurantAdvanced());
  await act(async () => {
    await result.current.loadRestaurantAdvancedState();
  });

  expect(result.current.restaurantAdvancedState).toBeNull();
  expect(restaurantAdvancedRepository.getRestaurantAdvancedState).not.toHaveBeenCalled();
  expect(restaurantAdvancedRepository.saveRestaurantAdvancedState).not.toHaveBeenCalled();
});

test("loadRestaurantAdvancedState loads Career first when it hasn't been loaded yet", async () => {
  const loadCareerState = jest.fn().mockResolvedValue(careerFixture());
  useCareerContext.mockReturnValue(careerContextFixture({ careerState: null, loadCareerState }));

  const { result } = renderHook(() => useRestaurantAdvanced());
  await act(async () => {
    await result.current.loadRestaurantAdvancedState();
  });

  expect(loadCareerState).toHaveBeenCalled();
  expect(result.current.restaurantAdvancedState).not.toBeNull();
});

test("applyRestaurantAction runs the decision through Career's applyHotelAdjustment and recomputes the cycle", async () => {
  const applyHotelAdjustment = jest.fn(async (updater) => {
    const state = careerFixture();
    return { ...state, hotel: updater(state.hotel) };
  });
  useCareerContext.mockReturnValue(careerContextFixture({ applyHotelAdjustment }));

  const { result } = renderHook(() => useRestaurantAdvanced());
  await act(async () => {
    await result.current.loadRestaurantAdvancedState();
  });
  await act(async () => {
    await result.current.applyRestaurantAction("optimiser-carte");
  });

  expect(applyHotelAdjustment).toHaveBeenCalled();
  expect(restaurantAdvancedRepository.saveRestaurantAdvancedState).toHaveBeenCalled();
});

test("getMenuEngineering/getFoodCost/getPopularity/getProfitability/getRestaurantForecast/getRestaurantDiagnostics/getRestaurantAdvancedReport all work", async () => {
  const { result } = renderHook(() => useRestaurantAdvanced());
  await act(async () => {
    await result.current.loadRestaurantAdvancedState();
  });

  expect(result.current.getMenuEngineering()?.counts).toBeDefined();
  expect(result.current.getFoodCost()?.overall).not.toBeUndefined();
  expect(result.current.getPopularity()?.items).toBeDefined();
  expect(result.current.getProfitability()?.items).toBeDefined();
  expect(result.current.getRestaurantForecast()?.scenarios).toBeDefined();
  expect(Array.isArray(result.current.getRestaurantDiagnostics())).toBe(true);
  expect(result.current.getRestaurantAdvancedReport()?.replay).toBeDefined();
});

describe("guest mode", () => {
  beforeEach(() => {
    const guestSession = { user: { id: "guest-1" }, mode: "guest" };
    useSupabaseSession.mockReturnValue({ session: guestSession, loading: false, isGuest: true, reload: jest.fn().mockResolvedValue(guestSession) });
  });

  test("loadRestaurantAdvancedState works end to end in guest mode", async () => {
    const { result } = renderHook(() => useRestaurantAdvanced());
    await act(async () => {
      await result.current.loadRestaurantAdvancedState();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.restaurantAdvancedState.foodCost).toBeDefined();
  });
});
