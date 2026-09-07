import { vipGuestEvent } from "./vipGuest";

test("conditions() requires the hotel to actually have rooms", () => {
  expect(vipGuestEvent.conditions({ hotelState: { structure: { roomCount: 50 } } })).toBe(true);
  expect(vipGuestEvent.conditions({ hotelState: { structure: { roomCount: 0 } } })).toBe(false);
  expect(vipGuestEvent.conditions({ hotelState: {} })).toBe(false);
});

test("probability() is higher when the hotel has a large marketing budget", () => {
  const highBudget = vipGuestEvent.probability({ hotelState: { marketing: { budget: 5000 } } });
  const lowBudget = vipGuestEvent.probability({ hotelState: { marketing: { budget: 500 } } });
  expect(highBudget).toBeGreaterThan(lowBudget);
});

test("apply() returns a message and a low severity", () => {
  const applied = vipGuestEvent.apply({}, {});
  expect(applied.message).toMatch(/vip/i);
  expect(applied.severity).toBe("low");
});

test("impact boosts revenue and reputation, and lasts a single day", () => {
  expect(vipGuestEvent.impact).toEqual({ revenue: 200, expenses: 0, staff: 0, reputation: 2 });
  expect(vipGuestEvent.duration).toBe(1);
});
