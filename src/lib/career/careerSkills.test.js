import { computeSkillBonuses, createInitialSkills, skillLabel, updateSkill } from "./careerSkills";

test("createInitialSkills starts every catalog skill at level 0", () => {
  const skills = createInitialSkills();
  expect(Object.values(skills).every((skill) => skill.level === 0 && skill.points === 0)).toBe(true);
});

test("updateSkill accumulates points and levels up every 10 points", () => {
  let skills = createInitialSkills();
  skills = updateSkill(skills, "negotiation", 7);
  expect(skills.negotiation).toEqual({ points: 7, level: 0 });

  skills = updateSkill(skills, "negotiation", 5);
  expect(skills.negotiation).toEqual({ points: 12, level: 1 });
});

test("updateSkill never drops points below 0", () => {
  let skills = createInitialSkills();
  skills = updateSkill(skills, "leadership", 5);
  skills = updateSkill(skills, "leadership", -20);
  expect(skills.leadership.points).toBe(0);
});

test("computeSkillBonuses derives a profit/expense multiplier from negotiation/management levels", () => {
  let skills = createInitialSkills();
  skills = updateSkill(skills, "negotiation", 30); // level 3
  skills = updateSkill(skills, "management", 20); // level 2
  const bonuses = computeSkillBonuses(skills);
  expect(bonuses.profitMultiplier).toBeCloseTo(1.03);
  expect(bonuses.expenseMultiplier).toBeCloseTo(0.98);
});

test("computeSkillBonuses defaults to neutral multipliers with no skills", () => {
  expect(computeSkillBonuses(createInitialSkills())).toEqual({ profitMultiplier: 1, expenseMultiplier: 1 });
});

test("skillLabel falls back to the raw id for an unknown skill", () => {
  expect(skillLabel("negotiation")).toBe("Négociation");
  expect(skillLabel("unknown")).toBe("unknown");
});
