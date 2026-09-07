import {
  createInitialRestaurantState,
  isRestaurantEmpty,
  isRestaurantReady,
  markRestaurantReady,
  validateRestaurantStructure,
} from "./restaurantState";

test("createInitialRestaurantState seeds an empty, not-ready establishment", () => {
  const state = createInitialRestaurantState();
  expect(state.structure.name).toBe("");
  expect(state.staff).toEqual([]);
  expect(state.progression.ready).toBe(false);
});

test("createInitialRestaurantState merges partial overrides without dropping defaults", () => {
  const state = createInitialRestaurantState({ structure: { name: "Le Central" } });
  expect(state.structure.name).toBe("Le Central");
  expect(state.structure.capacity).toBe(0);
});

test("isRestaurantEmpty is true for a freshly-seeded state", () => {
  expect(isRestaurantEmpty(createInitialRestaurantState())).toBe(true);
});

test("isRestaurantEmpty is false once name/concept/capacity are set", () => {
  const state = createInitialRestaurantState({ structure: { name: "Le Central", concept: "Bistro", capacity: 40 } });
  expect(isRestaurantEmpty(state)).toBe(false);
});

test("isRestaurantReady reflects progression.ready", () => {
  expect(isRestaurantReady(createInitialRestaurantState())).toBe(false);
  expect(isRestaurantReady(markRestaurantReady(createInitialRestaurantState()))).toBe(true);
});

test("markRestaurantReady does not mutate the input state", () => {
  const state = createInitialRestaurantState();
  const next = markRestaurantReady(state);
  expect(state.progression.ready).toBe(false);
  expect(next.progression.ready).toBe(true);
});

test("validateRestaurantStructure rejects a fully empty structure with one error per field", () => {
  const { valid, errors } = validateRestaurantStructure({});
  expect(valid).toBe(false);
  expect(errors.map((error) => error.field).sort()).toEqual(["capacity", "concept", "location", "name"]);
});

test("validateRestaurantStructure accepts a complete structure", () => {
  const { valid, errors } = validateRestaurantStructure({ name: "Le Central", concept: "Bistro", location: "Lyon", capacity: 40 });
  expect(valid).toBe(true);
  expect(errors).toEqual([]);
});

test("validateRestaurantStructure rejects a zero or negative capacity", () => {
  const { valid, errors } = validateRestaurantStructure({ name: "Le Central", concept: "Bistro", location: "Lyon", capacity: 0 });
  expect(valid).toBe(false);
  expect(errors).toEqual([{ field: "capacity", message: expect.any(String) }]);
});
