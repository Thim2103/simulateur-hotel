import { renderHook, act } from "@testing-library/react";
import { useRestaurant } from "./useRestaurant";
import { getRestaurantState, saveRestaurantState } from "../lib/restaurantRepository";
import { createInitialRestaurantState } from "../lib/restaurant";
import { useSupabaseSession } from "./useSupabaseSession";

jest.mock("../lib/restaurantRepository", () => ({
  getRestaurantState: jest.fn(),
  saveRestaurantState: jest.fn(),
}));

jest.mock("./useSupabaseSession");

function validStructure(overrides = {}) {
  return { name: "Le Central", concept: "Bistro", location: "Lyon", capacity: 40, ...overrides };
}

beforeEach(() => {
  window.localStorage.clear();
  getRestaurantState.mockReset();
  saveRestaurantState.mockReset().mockResolvedValue(undefined);
  // Every existing test below exercises the real-Supabase-session path
  // (unchanged behaviour); see the "guest mode" describe block for the
  // localStorage-backed path.
  useSupabaseSession.mockReturnValue({ session: { user: { id: "u1" }, mode: "supabase" }, loading: false, isGuest: false });
});

test("loadRestaurantState stores the loaded state", async () => {
  const state = createInitialRestaurantState({ structure: validStructure() });
  getRestaurantState.mockResolvedValue(state);
  const { result } = renderHook(() => useRestaurant());

  await act(async () => {
    await result.current.loadRestaurantState();
  });

  expect(result.current.restaurantState).toEqual(state);
  expect(result.current.error).toBeNull();
});

test("loadRestaurantState surfaces the error without silently falling back to mock data", async () => {
  getRestaurantState.mockRejectedValue(new Error("Supabase unreachable"));
  const { result } = renderHook(() => useRestaurant());

  await act(async () => {
    await expect(result.current.loadRestaurantState()).rejects.toThrow("Supabase unreachable");
  });

  expect(result.current.error).toEqual(expect.any(Error));
  expect(result.current.restaurantState).toBeNull();
});

test("validateRestaurantStructure reports missing fields", () => {
  const { result } = renderHook(() => useRestaurant());
  const { valid, errors } = result.current.validateRestaurantStructure({});
  expect(valid).toBe(false);
  expect(errors.length).toBeGreaterThan(0);
});

test("updateRestaurantField merges a change into one top-level section", () => {
  const { result } = renderHook(() => useRestaurant());
  act(() => result.current.updateRestaurantField("structure", { name: "Le Central" }));
  expect(result.current.restaurantState.structure.name).toBe("Le Central");
});

test("submitStructure refuses to save an invalid structure", async () => {
  const { result } = renderHook(() => useRestaurant());

  let outcome;
  await act(async () => {
    outcome = await result.current.submitStructure({});
  });

  expect(outcome.valid).toBe(false);
  expect(saveRestaurantState).not.toHaveBeenCalled();
});

test("submitStructure saves a valid structure and marks progression.ready", async () => {
  const { result } = renderHook(() => useRestaurant());

  await act(async () => {
    await result.current.submitStructure(validStructure());
  });

  expect(saveRestaurantState).toHaveBeenCalledTimes(1);
  expect(result.current.restaurantState.progression.ready).toBe(true);
  expect(result.current.restaurantState.structure.name).toBe("Le Central");
});

test("runRestaurantCycle runs the engine against the current state and stores the report", async () => {
  const { result } = renderHook(() => useRestaurant());
  await act(async () => {
    await result.current.submitStructure(validStructure());
  });

  act(() => {
    result.current.runRestaurantCycle({ events: [] });
  });

  expect(result.current.restaurantReport).toEqual(expect.objectContaining({ demand: expect.any(Number) }));
});

describe("guest mode", () => {
  beforeEach(() => {
    useSupabaseSession.mockReturnValue({ session: { user: { id: "guest-1" }, mode: "guest" }, loading: false, isGuest: true });
  });

  test("loadRestaurantState seeds a ready-to-play establishment in localStorage on first load, bypassing Supabase entirely", async () => {
    const { result } = renderHook(() => useRestaurant());

    await act(async () => {
      await result.current.loadRestaurantState();
    });

    expect(getRestaurantState).not.toHaveBeenCalled();
    expect(result.current.restaurantState.progression.ready).toBe(true);
    expect(result.current.restaurantState.staff.length).toBeGreaterThan(0);
    expect(result.current.isGuest).toBe(true);
  });

  test("loadRestaurantState reuses the same guest establishment across reloads instead of reseeding", async () => {
    const first = renderHook(() => useRestaurant());
    await act(async () => {
      await first.result.current.loadRestaurantState();
    });
    const seededName = first.result.current.restaurantState.structure.name;

    const second = renderHook(() => useRestaurant());
    await act(async () => {
      await second.result.current.loadRestaurantState();
    });

    expect(second.result.current.restaurantState.structure.name).toBe(seededName);
  });

  test("submitStructure persists to localStorage instead of calling saveRestaurantState", async () => {
    const { result } = renderHook(() => useRestaurant());

    await act(async () => {
      await result.current.submitStructure(validStructure());
    });

    expect(saveRestaurantState).not.toHaveBeenCalled();
    expect(result.current.restaurantState.progression.ready).toBe(true);

    const reloaded = renderHook(() => useRestaurant());
    await act(async () => {
      await reloaded.result.current.loadRestaurantState();
    });
    expect(reloaded.result.current.restaurantState.structure.name).toBe("Le Central");
  });
});
