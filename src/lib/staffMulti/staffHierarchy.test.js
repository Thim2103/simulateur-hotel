import { applyPromotions, planPromotions } from "./staffHierarchy";

function staffMember(overrides = {}) {
  return { id: 1, name: "Ada", role: "Serveur", skill_level: 80, productivity: 80, experience_years: 2, salary: 2000, ...overrides };
}

function hotel(id, staff) {
  return { id, restaurantState: { staff } };
}

test("promotes staff meeting the skill/productivity/experience thresholds", () => {
  const promotions = planPromotions([hotel("a", [staffMember()])]);
  expect(promotions).toHaveLength(1);
  expect(promotions[0]).toMatchObject({ fromRole: "Serveur", toRole: "Serveur senior" });
});

test("does not promote staff below any one threshold", () => {
  expect(planPromotions([hotel("a", [staffMember({ skill_level: 50 })])])).toEqual([]);
  expect(planPromotions([hotel("a", [staffMember({ productivity: 50 })])])).toEqual([]);
  expect(planPromotions([hotel("a", [staffMember({ experience_years: 0 })])])).toEqual([]);
});

test("does not promote a role that isn't on the ladder", () => {
  expect(planPromotions([hotel("a", [staffMember({ role: "Directeur" })])])).toEqual([]);
});

test("gives a salary increase along with the new role", () => {
  const promotions = planPromotions([hotel("a", [staffMember({ salary: 2000 })])]);
  expect(promotions[0].salaryAfter).toBeGreaterThan(2000);
});

test("applyPromotions updates the promoted staff member's role and salary", () => {
  const hotels = [hotel("a", [staffMember()])];
  const promotions = planPromotions(hotels);
  const result = applyPromotions(hotels, promotions);

  expect(result[0].restaurantState.staff[0].role).toBe("Serveur senior");
  expect(result[0].restaurantState.staff[0].salary).toBeGreaterThan(2000);
});

test("applyPromotions with no promotions returns the hotels unchanged", () => {
  const hotels = [hotel("a", [staffMember({ role: "Directeur" })])];
  expect(applyPromotions(hotels, [])).toEqual(hotels);
});

test("never throws with no arguments at all", () => {
  expect(() => planPromotions()).not.toThrow();
  expect(() => applyPromotions()).not.toThrow();
});
