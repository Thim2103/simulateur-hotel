import { updateStaff } from "./updateStaff";

function staffMember(overrides = {}) {
  return { id: 1, name: "Ada", productivity: 80, satisfaction: 70, ...overrides };
}

test("reduces productivity (fatigue) on a busy (high-demand) day", () => {
  const result = updateStaff({ staff: [staffMember()], demand: 80, rng: () => 1 });
  expect(result.staff[0].productivity).toBe(80 - 3);
  expect(result.changes.fatigueApplied).toBe(-3);
});

test("recovers productivity on a quiet (low-demand) day", () => {
  const result = updateStaff({ staff: [staffMember({ productivity: 70 })], demand: 20, rng: () => 1 });
  expect(result.staff[0].productivity).toBe(76);
});

test("clamps productivity between 20 and 100", () => {
  const tired = updateStaff({ staff: [staffMember({ productivity: 21 })], demand: 90, rng: () => 1 });
  expect(tired.staff[0].productivity).toBeGreaterThanOrEqual(20);

  const rested = updateStaff({ staff: [staffMember({ productivity: 98 })], demand: 0, rng: () => 1 });
  expect(rested.staff[0].productivity).toBeLessThanOrEqual(100);
});

test("negative event impact lowers morale (satisfaction) and records the change", () => {
  const result = updateStaff({ staff: [staffMember({ satisfaction: 70 })], eventSatisfactionImpact: -0.1, rng: () => 1 });
  expect(result.staff[0].satisfaction).toBeLessThan(70);
  expect(result.changes.moraleChanges).toHaveLength(1);
});

test("a staff member resigns once morale is at/below the threshold and the resignation roll succeeds", () => {
  const result = updateStaff({
    staff: [staffMember({ satisfaction: 15 })],
    eventSatisfactionImpact: 0,
    rng: () => 0, // always "succeeds" (below any probability threshold)
  });

  expect(result.staff).toHaveLength(0);
  expect(result.changes.departures).toEqual([{ id: 1, name: "Ada", reason: "morale trop basse" }]);
});

test("a staff member below the threshold stays if the resignation roll fails", () => {
  const result = updateStaff({
    staff: [staffMember({ satisfaction: 15 })],
    eventSatisfactionImpact: 0,
    rng: () => 0.999, // always "fails"
  });

  expect(result.staff).toHaveLength(1);
  expect(result.changes.departures).toHaveLength(0);
});

test("handles an empty staff list without throwing", () => {
  expect(() => updateStaff({ staff: [] })).not.toThrow();
  expect(updateStaff({ staff: [] }).staff).toEqual([]);
});
