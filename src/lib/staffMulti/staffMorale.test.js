import { calculateMorale } from "./staffMorale";

function hotel(id, satisfactions) {
  return { id, restaurantState: { staff: satisfactions.map((satisfaction, index) => ({ id: `${id}-${index}`, satisfaction })) } };
}

test("computes each hotel's own average satisfaction as its local morale", () => {
  const { moraleByHotel } = calculateMorale([hotel("a", [80, 60]), hotel("b", [40])]);
  expect(moraleByHotel.a).toBe(70);
  expect(moraleByHotel.b).toBe(40);
});

test("weights the global morale by each hotel's headcount", () => {
  // a: 2 staff averaging 80; b: 1 staff at 20 -> global = (80+80+20)/3 = 60
  const { moraleGlobal } = calculateMorale([hotel("a", [80, 80]), hotel("b", [20])]);
  expect(moraleGlobal).toBe(60);
});

test("reports null (not a misleading 0) for a hotel with no staff", () => {
  const { moraleByHotel } = calculateMorale([hotel("a", [])]);
  expect(moraleByHotel.a).toBeNull();
});

test("excludes staff-less hotels from the global average instead of dragging it to 0", () => {
  const { moraleGlobal } = calculateMorale([hotel("a", []), hotel("b", [80])]);
  expect(moraleGlobal).toBe(80);
});

test("moraleGlobal is null when no hotel has any staff at all", () => {
  expect(calculateMorale([hotel("a", [])]).moraleGlobal).toBeNull();
});

test("handles an empty chain without throwing", () => {
  expect(() => calculateMorale([])).not.toThrow();
  expect(calculateMorale([])).toEqual({ moraleGlobal: null, moraleByHotel: {} });
});

test("never throws with no argument at all", () => {
  expect(() => calculateMorale()).not.toThrow();
});
