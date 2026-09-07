import { staffStrikeEvent } from "./staffStrike";

test("conditions() requires at least one staff member", () => {
  expect(staffStrikeEvent.conditions({ restaurantState: { staff: [{ id: 1 }] } })).toBe(true);
  expect(staffStrikeEvent.conditions({ restaurantState: { staff: [] } })).toBe(false);
  expect(staffStrikeEvent.conditions({ restaurantState: {} })).toBe(false);
});

test("probability() rises sharply as average staff morale drops", () => {
  const highMorale = staffStrikeEvent.probability({ restaurantState: { staff: [{ satisfaction: 90 }] } });
  const midMorale = staffStrikeEvent.probability({ restaurantState: { staff: [{ satisfaction: 50 }] } });
  const lowMorale = staffStrikeEvent.probability({ restaurantState: { staff: [{ satisfaction: 10 }] } });

  expect(lowMorale).toBeGreaterThan(midMorale);
  expect(midMorale).toBeGreaterThan(highMorale);
});

test("apply() returns a high-severity message", () => {
  const applied = staffStrikeEvent.apply({}, {});
  expect(applied.message).toMatch(/grève/i);
  expect(applied.severity).toBe("high");
});

test("impact hurts revenue but the resolution boosts morale, for two days", () => {
  expect(staffStrikeEvent.impact).toEqual({ revenue: -400, expenses: 100, staff: 8, reputation: -2 });
  expect(staffStrikeEvent.duration).toBe(2);
});
