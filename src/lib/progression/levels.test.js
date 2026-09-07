import { determineLevel, LEVELS } from "./levels";

test("stays at level 1 with zero/negative XP", () => {
  expect(determineLevel(0).level).toBe(1);
  expect(determineLevel(-50).level).toBe(1);
});

test("reaches the level whose threshold is crossed", () => {
  expect(determineLevel(99).level).toBe(1);
  expect(determineLevel(100).level).toBe(2);
  expect(determineLevel(300).level).toBe(3);
});

test("reaches the highest level once XP exceeds every threshold", () => {
  const result = determineLevel(999999);
  expect(result.level).toBe(LEVELS[LEVELS.length - 1].level);
  expect(result.xpForNextLevel).toBeNull();
  expect(result.progress).toBe(100);
});

test("reports how much XP remains to the next level", () => {
  const result = determineLevel(150);
  expect(result.xpForNextLevel).toBe(300);
  expect(result.xpToNextLevel).toBe(150);
});

test("computes progress toward the next level as a 0-100 percentage", () => {
  // level 2 spans xp 100..300; 150 is a quarter of the way through.
  expect(determineLevel(150).progress).toBe(25);
});

test("never throws on invalid input", () => {
  expect(() => determineLevel(undefined)).not.toThrow();
  expect(() => determineLevel(NaN)).not.toThrow();
  expect(determineLevel(NaN).level).toBe(1);
});
