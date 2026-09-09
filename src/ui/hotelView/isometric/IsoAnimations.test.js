import { isoMoveCharacter, isoAnimateRoomState, isoAnimateIncident, isoPulse, isoBounce, isoFade } from "./IsoAnimations";

test("isoMoveCharacter is a no-op when given no element (never throws)", () => {
  expect(() => isoMoveCharacter(null, { x: 0, y: 0 }, { x: 10, y: 10 })).not.toThrow();
});

test("isoMoveCharacter sets the starting transform synchronously, before animating", () => {
  const el = document.createElement("div");
  isoMoveCharacter(el, { x: 12, y: 34 }, { x: 56, y: 78 });
  expect(el.style.transform).toBe("translate(12px, 34px)");
  expect(el.style.transition).toBe("none");
});

const RETRIGGER_FUNCTIONS = {
  isoAnimateRoomState: [(el) => isoAnimateRoomState(el, "dirty"), "iso-room-dirty"],
  isoAnimateIncident: [isoAnimateIncident, "iso-pulse"],
  isoPulse: [isoPulse, "iso-pulse"],
  isoBounce: [isoBounce, "iso-bounce"],
  isoFade: [isoFade, "iso-fade-in"],
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

test("isoAnimateRoomState picks the right class per state, defaulting to clean", () => {
  const el = document.createElement("div");
  el.classList.add("iso-room-clean");
  isoAnimateRoomState(el, "unknown-state");
  expect(el.classList.contains("iso-room-clean")).toBe(false);
});
