import { optimizeStaffing } from "./staffOptimization";

function hotel(id, name, roomCount, staff) {
  return { id, name, hotelState: { structure: { roomCount } }, restaurantState: { staff } };
}

test("flags a hotel with rooms but no staff at all as high priority", () => {
  const result = optimizeStaffing([hotel("a", "A", 20, [])]);
  expect(result.recommendations).toContainEqual(expect.objectContaining({ id: "no_staff_a", priority: "high" }));
});

test("flags a hotel still understaffed after this cycle's transfers", () => {
  const result = optimizeStaffing([hotel("a", "A", 100, [{ id: 1, satisfaction: 70 }])], []);
  expect(result.recommendations.some((r) => r.id === "understaffed_a")).toBe(true);
});

test("does not flag a hotel as still understaffed if it just received a transfer", () => {
  const result = optimizeStaffing(
    [hotel("a", "A", 100, [{ id: 1, satisfaction: 70 }])],
    [{ staffId: 2, fromHotelId: "b", toHotelId: "a" }]
  );
  expect(result.recommendations.some((r) => r.id === "understaffed_a")).toBe(false);
});

test("flags a hotel with low average staff morale", () => {
  const result = optimizeStaffing([hotel("a", "A", 10, [{ id: 1, satisfaction: 20 }, { id: 2, satisfaction: 30 }])]);
  expect(result.recommendations.some((r) => r.id === "low_morale_a")).toBe(true);
});

test("returns no recommendations for a healthy, well-staffed chain", () => {
  const staff = Array.from({ length: 10 }, (_, i) => ({ id: i, satisfaction: 80 }));
  const result = optimizeStaffing([hotel("a", "A", 10, staff)]);
  expect(result.recommendations).toEqual([]);
});

test("never throws with no arguments at all", () => {
  expect(() => optimizeStaffing()).not.toThrow();
});
