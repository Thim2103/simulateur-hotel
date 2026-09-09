import { roomDisplayState, roomStateClassName, retriggerAnimation, moveCharacter } from "./HotelAnimations";

test("roomDisplayState prioritises the transient cleaning flag over everything else", () => {
  expect(roomDisplayState({ status: "occupée", housekeeping_status: "dirty" }, true)).toBe("cleaning");
});

test("roomDisplayState reports occupied rooms regardless of housekeeping status", () => {
  expect(roomDisplayState({ status: "occupée", housekeeping_status: "clean" })).toBe("occupied");
});

test("roomDisplayState reports dirty free rooms", () => {
  expect(roomDisplayState({ status: "libre", housekeeping_status: "dirty" })).toBe("dirty");
});

test("roomDisplayState defaults to clean", () => {
  expect(roomDisplayState({ status: "libre", housekeeping_status: "clean" })).toBe("clean");
  expect(roomDisplayState(null)).toBe("clean");
});

test("roomStateClassName maps every state to a real CSS class, with a safe fallback", () => {
  expect(roomStateClassName("dirty")).toBe("hv-room-dirty");
  expect(roomStateClassName("unknown")).toBe("hv-room-clean");
});

test("retriggerAnimation is a no-op when given no element (never throws)", () => {
  expect(() => retriggerAnimation(null, "hv-room-dirty")).not.toThrow();
});

test("retriggerAnimation removes then re-adds the class via requestAnimationFrame", () => {
  const el = document.createElement("div");
  el.classList.add("hv-room-dirty");
  retriggerAnimation(el, "hv-room-dirty");
  expect(el.classList.contains("hv-room-dirty")).toBe(false);
});

test("moveCharacter is a no-op when given no element (never throws)", () => {
  expect(() => moveCharacter(null, { from: "0%", to: "50%" })).not.toThrow();
});
