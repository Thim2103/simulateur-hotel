import { walkCycle, cleanCycle, eatCycle, checkinCycle, incidentPulse, roomTransition, roomTransitionClassName } from "./RetroAnimations";

const RETRIGGER_FUNCTIONS = {
  walkCycle: [walkCycle, "retro-walk-cycle"],
  cleanCycle: [cleanCycle, "retro-clean-cycle"],
  eatCycle: [eatCycle, "retro-eat-cycle"],
  checkinCycle: [checkinCycle, "retro-checkin-cycle"],
  incidentPulse: [incidentPulse, "retro-incident-pulse"],
};

Object.entries(RETRIGGER_FUNCTIONS).forEach(([name, [fn, className]]) => {
  test(`${name} is a no-op when given no element (never throws)`, () => {
    expect(() => fn(null)).not.toThrow();
  });

  test(`${name} removes then re-adds its own CSS class on the element`, () => {
    const el = document.createElement("div");
    el.classList.add(className);
    fn(el);
    expect(el.classList.contains(className)).toBe(false);
  });
});

test("roomTransitionClassName maps every state to a real CSS class, defaulting to clean", () => {
  expect(roomTransitionClassName("dirty")).toBe("retro-room-dirty");
  expect(roomTransitionClassName("unknown")).toBe("retro-room-clean");
});

test("roomTransition is a no-op when given no element (never throws)", () => {
  expect(() => roomTransition(null, "dirty")).not.toThrow();
});

test("roomTransition retriggers the class matching the given state", () => {
  const el = document.createElement("div");
  el.classList.add("retro-room-cleaning");
  roomTransition(el, "cleaning");
  expect(el.classList.contains("retro-room-cleaning")).toBe(false);
});
