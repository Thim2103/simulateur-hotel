import {
  walkCycle,
  cleanCycle,
  eatCycle,
  checkinCycle,
  cookCycle,
  barCycle,
  laundryCycle,
  incidentPulse,
  roomTransition,
  roomTransitionClassName,
  activityCycleClassName,
} from "./IsoFinalAnimations";

const RETRIGGER_FUNCTIONS = {
  walkCycle: [walkCycle, "if-walk-cycle"],
  cleanCycle: [cleanCycle, "if-clean-cycle"],
  eatCycle: [eatCycle, "if-eat-cycle"],
  checkinCycle: [checkinCycle, "if-checkin-cycle"],
  cookCycle: [cookCycle, "if-cook-cycle"],
  barCycle: [barCycle, "if-bar-cycle"],
  laundryCycle: [laundryCycle, "if-laundry-cycle"],
  incidentPulse: [incidentPulse, "if-incident-pulse"],
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
  expect(roomTransitionClassName("occupied")).toBe("if-room-occupied");
  expect(roomTransitionClassName("unknown")).toBe("if-room-clean");
});

test("roomTransition is a no-op when given no element (never throws)", () => {
  expect(() => roomTransition(null, "dirty")).not.toThrow();
});

test("activityCycleClassName maps every named activity to its own cycle, defaulting to walking", () => {
  expect(activityCycleClassName("cooking")).toBe("if-cook-cycle");
  expect(activityCycleClassName("bartending")).toBe("if-bar-cycle");
  expect(activityCycleClassName("laundry")).toBe("if-laundry-cycle");
  expect(activityCycleClassName("unknown")).toBe("if-walk-cycle");
});
