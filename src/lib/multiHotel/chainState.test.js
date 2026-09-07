import { addHotel, createChainState, getActiveHotel, removeHotel, setActiveHotel, updateHotel } from "./chainState";

function hotel(id) {
  return { id, name: `Hotel ${id}` };
}

test("createChainState starts empty with no active hotel", () => {
  expect(createChainState()).toEqual({ hotels: [], activeHotelId: null });
});

test("createChainState makes the first hotel active by default", () => {
  const state = createChainState({ hotels: [hotel("a"), hotel("b")] });
  expect(state.activeHotelId).toBe("a");
});

test("addHotel appends a hotel and keeps the existing active hotel", () => {
  let state = createChainState({ hotels: [hotel("a")] });
  state = addHotel(state, hotel("b"));
  expect(state.hotels.map((h) => h.id)).toEqual(["a", "b"]);
  expect(state.activeHotelId).toBe("a");
});

test("addHotel to an empty chain makes the new hotel active", () => {
  const state = addHotel(createChainState(), hotel("a"));
  expect(state.activeHotelId).toBe("a");
});

test("removeHotel drops the hotel and falls back to another active hotel if it was the active one", () => {
  let state = createChainState({ hotels: [hotel("a"), hotel("b")] });
  state = removeHotel(state, "a");
  expect(state.hotels.map((h) => h.id)).toEqual(["b"]);
  expect(state.activeHotelId).toBe("b");
});

test("removeHotel leaves activeHotelId null once the last hotel is removed", () => {
  let state = createChainState({ hotels: [hotel("a")] });
  state = removeHotel(state, "a");
  expect(state.activeHotelId).toBeNull();
});

test("setActiveHotel switches to an existing hotel", () => {
  const state = setActiveHotel(createChainState({ hotels: [hotel("a"), hotel("b")] }), "b");
  expect(state.activeHotelId).toBe("b");
});

test("setActiveHotel is a no-op for a hotel id that doesn't exist", () => {
  const state = createChainState({ hotels: [hotel("a")] });
  expect(setActiveHotel(state, "does-not-exist")).toBe(state);
});

test("getActiveHotel returns the active hotel's full record", () => {
  const state = createChainState({ hotels: [hotel("a"), hotel("b")] });
  expect(getActiveHotel(state)).toEqual(hotel("a"));
});

test("getActiveHotel returns null for an empty chain", () => {
  expect(getActiveHotel(createChainState())).toBeNull();
});

test("updateHotel merges changes into one hotel without touching the others", () => {
  let state = createChainState({ hotels: [hotel("a"), hotel("b")] });
  state = updateHotel(state, "a", { name: "Renamed" });
  expect(state.hotels.find((h) => h.id === "a").name).toBe("Renamed");
  expect(state.hotels.find((h) => h.id === "b").name).toBe("Hotel b");
});
