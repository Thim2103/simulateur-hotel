import { applyTransfers, planTransfers } from "./staffTransfer";

function staffMember(id, satisfaction) {
  return { id, name: `Staff ${id}`, satisfaction };
}

function hotel(id, name, roomCount, staff) {
  return { id, name, hotelState: { structure: { roomCount } }, restaurantState: { staff } };
}

test("proposes no transfers when staff-per-room is already balanced across hotels", () => {
  const hotels = [hotel("a", "A", 10, [staffMember(1, 70)]), hotel("b", "B", 10, [staffMember(2, 70)])];
  expect(planTransfers(hotels)).toEqual([]);
});

test("proposes a transfer from the overstaffed hotel to the understaffed one", () => {
  const hotels = [
    hotel("a", "A", 10, [staffMember(1, 50), staffMember(2, 50), staffMember(3, 50), staffMember(4, 50)]),
    hotel("b", "B", 10, [staffMember(5, 50)]),
  ];
  const transfers = planTransfers(hotels);
  expect(transfers).toHaveLength(1);
  expect(transfers[0].fromHotelId).toBe("a");
  expect(transfers[0].toHotelId).toBe("b");
});

test("gives up the lowest-morale staff member first", () => {
  const hotels = [
    hotel("a", "A", 10, [staffMember(1, 90), staffMember(2, 20), staffMember(3, 80), staffMember(4, 85)]),
    hotel("b", "B", 10, [staffMember(5, 50)]),
  ];
  const transfers = planTransfers(hotels);
  expect(transfers[0].staffId).toBe(2);
});

test("does not propose more transfers than requested", () => {
  const hotels = [
    hotel("a", "A", 10, Array.from({ length: 10 }, (_, i) => staffMember(i, 50))),
    hotel("b", "B", 10, []),
    hotel("c", "C", 10, []),
  ];
  const transfers = planTransfers(hotels, { maxTransfers: 1 });
  expect(transfers).toHaveLength(1);
});

test("ignores hotels with zero rooms (nothing to balance against)", () => {
  const hotels = [hotel("a", "A", 0, [staffMember(1, 50)]), hotel("b", "B", 10, [])];
  expect(planTransfers(hotels)).toEqual([]);
});

test("applyTransfers moves the staff member's record from the origin hotel to the destination", () => {
  const hotels = [hotel("a", "A", 10, [staffMember(1, 50)]), hotel("b", "B", 10, [])];
  const result = applyTransfers(hotels, [{ staffId: 1, staffName: "Staff 1", fromHotelId: "a", toHotelId: "b" }]);

  expect(result.find((h) => h.id === "a").restaurantState.staff).toEqual([]);
  expect(result.find((h) => h.id === "b").restaurantState.staff.map((s) => s.id)).toEqual([1]);
});

test("applyTransfers with no transfers returns the hotels unchanged", () => {
  const hotels = [hotel("a", "A", 10, [staffMember(1, 50)])];
  expect(applyTransfers(hotels, [])).toEqual(hotels);
});

test("never throws with no arguments at all", () => {
  expect(() => planTransfers()).not.toThrow();
  expect(() => applyTransfers()).not.toThrow();
});
