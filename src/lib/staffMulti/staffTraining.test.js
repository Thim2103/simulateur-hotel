import { applyTraining, planTraining } from "./staffTraining";

function staffMember(id, skillLevel, productivity = 50) {
  return { id, name: `Staff ${id}`, skill_level: skillLevel, productivity };
}

function hotel(id, staff) {
  return { id, restaurantState: { staff } };
}

test("selects staff below the skill target for training", () => {
  const training = planTraining([hotel("a", [staffMember(1, 40), staffMember(2, 90)])]);
  expect(training.map((t) => t.staffId)).toEqual([1]);
});

test("trains the lowest-skilled staff first when there are more candidates than slots", () => {
  const training = planTraining([hotel("a", [staffMember(1, 60), staffMember(2, 20), staffMember(3, 40)])], { maxPerHotel: 2 });
  expect(training.map((t) => t.staffId)).toEqual([2, 3]);
});

test("does not select staff already at or above the skill target", () => {
  expect(planTraining([hotel("a", [staffMember(1, 70)])])).toEqual([]);
  expect(planTraining([hotel("a", [staffMember(1, 98)])])).toEqual([]);
});

test("applyTraining raises the trained staff member's skill_level and productivity", () => {
  const hotels = [hotel("a", [staffMember(1, 40, 50)])];
  const training = planTraining(hotels);
  const result = applyTraining(hotels, training);

  const person = result[0].restaurantState.staff[0];
  expect(person.skill_level).toBeGreaterThan(40);
  expect(person.productivity).toBeGreaterThan(50);
});

test("applyTraining leaves untrained staff and other hotels untouched", () => {
  const hotels = [hotel("a", [staffMember(1, 90)]), hotel("b", [staffMember(2, 90)])];
  expect(applyTraining(hotels, [])).toEqual(hotels);
});

test("never throws with no arguments at all", () => {
  expect(() => planTraining()).not.toThrow();
  expect(() => applyTraining()).not.toThrow();
});
