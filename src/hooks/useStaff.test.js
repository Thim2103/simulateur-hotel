import { renderHook, act } from "@testing-library/react";
import { useStaff } from "./useStaff";

function hotel(overrides = {}) {
  return {
    id: "a",
    name: "Riviera Palace",
    city: "Nice",
    restaurantState: { staff: [] },
    ...overrides,
  };
}

function staffMember(overrides = {}) {
  return { id: 1, name: "Ada", role: "Serveur", skill_level: 40, productivity: 50, satisfaction: 70, experience_years: 1, ...overrides };
}

test("setHotels seeds staffState.hotels", () => {
  const { result } = renderHook(() => useStaff());
  act(() => result.current.setHotels([hotel()]));
  expect(result.current.staffState.hotels).toEqual([hotel()]);
});

test("optimizeStaff runs the staff engine and stores the report", async () => {
  const { result } = renderHook(() => useStaff());
  act(() => result.current.setHotels([hotel({ restaurantState: { staff: [staffMember()] } })]));

  await act(async () => {
    await result.current.optimizeStaff({ rng: () => 0.999 });
  });

  expect(result.current.staffReport).not.toBeNull();
  expect(result.current.staffReport.staffGlobal).toEqual([expect.objectContaining({ id: 1 })]);
  expect(result.current.isRunning).toBe(false);
  expect(result.current.error).toBeNull();
});

test("optimizeStaff surfaces an error and leaves it in state", async () => {
  const { result } = renderHook(() => useStaff());
  act(() => result.current.setHotels([hotel({ restaurantState: { staff: [staffMember()] } })]));

  await act(async () => {
    await expect(
      result.current.optimizeStaff({
        rng: () => {
          throw new Error("boom");
        },
      })
    ).rejects.toThrow("boom");
  });

  expect(result.current.error).toEqual(expect.any(Error));
  expect(result.current.isRunning).toBe(false);
});

test("transferStaff moves a staff member between hotels", () => {
  const { result } = renderHook(() => useStaff());
  const hotels = [
    hotel({ id: "a", restaurantState: { staff: [staffMember({ id: 1 })] } }),
    hotel({ id: "b", restaurantState: { staff: [] } }),
  ];
  act(() => result.current.setHotels(hotels));

  act(() => result.current.transferStaff(1, "a", "b"));

  const byId = Object.fromEntries(result.current.staffState.hotels.map((h) => [h.id, h.restaurantState.staff]));
  expect(byId.a).toEqual([]);
  expect(byId.b).toEqual([expect.objectContaining({ id: 1 })]);
});

test("trainStaff bumps the target staff member's skill and productivity", () => {
  const { result } = renderHook(() => useStaff());
  act(() => result.current.setHotels([hotel({ restaurantState: { staff: [staffMember({ id: 1, skill_level: 40, productivity: 50 })] } })]));

  act(() => result.current.trainStaff(1, "a"));

  const trained = result.current.staffState.hotels[0].restaurantState.staff[0];
  expect(trained.skill_level).toBe(45);
  expect(trained.productivity).toBe(52);
});

test("trainStaff is a no-op when the staff member doesn't exist", () => {
  const { result } = renderHook(() => useStaff());
  const hotels = [hotel({ restaurantState: { staff: [staffMember({ id: 1 })] } })];
  act(() => result.current.setHotels(hotels));

  act(() => result.current.trainStaff(999, "a"));

  expect(result.current.staffState.hotels).toEqual(hotels);
});
