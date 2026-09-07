import { checkAchievements } from "./achievements";

test("unlocks first_profit the first time profit is positive", () => {
  const { newAchievements, unlockedAchievements } = checkAchievements({ dailyReport: { profit: 50 } }, []);
  expect(newAchievements.map((a) => a.id)).toContain("first_profit");
  expect(unlockedAchievements).toContain("first_profit");
});

test("does not re-unlock an achievement already in the previously-unlocked list", () => {
  const { newAchievements, unlockedAchievements } = checkAchievements({ dailyReport: { profit: 50 } }, ["first_profit"]);
  expect(newAchievements).toHaveLength(0);
  expect(unlockedAchievements).toEqual(["first_profit"]);
});

test("five_star_reputation requires reputation >= 90", () => {
  expect(checkAchievements({ reputation: 90 }, []).newAchievements.map((a) => a.id)).toContain("five_star_reputation");
  expect(checkAchievements({ reputation: 89 }, []).newAchievements.map((a) => a.id)).not.toContain("five_star_reputation");
});

test("team_builder requires at least six staff members", () => {
  const staff = Array.from({ length: 6 }, (_, i) => ({ id: i }));
  expect(checkAchievements({ restaurantState: { staff } }, []).newAchievements.map((a) => a.id)).toContain("team_builder");
  expect(checkAchievements({ restaurantState: { staff: staff.slice(0, 5) } }, []).newAchievements.map((a) => a.id)).not.toContain("team_builder");
});

test("sustainability_champion requires an ESG score >= 90", () => {
  expect(checkAchievements({ hotelState: { esg: { sustainabilityScore: 90 } } }, []).newAchievements.map((a) => a.id)).toContain(
    "sustainability_champion"
  );
});

test("century_club requires 100 cycles", () => {
  expect(checkAchievements({ hotelState: { progression: { cycles: 100 } } }, []).newAchievements.map((a) => a.id)).toContain("century_club");
  expect(checkAchievements({ hotelState: { progression: { cycles: 99 } } }, []).newAchievements.map((a) => a.id)).not.toContain("century_club");
});

test("veteran_manager requires level >= 5", () => {
  expect(checkAchievements({ level: 5 }, []).newAchievements.map((a) => a.id)).toContain("veteran_manager");
});

test("multiple achievements can unlock the same day", () => {
  const { newAchievements } = checkAchievements({ dailyReport: { profit: 1 }, reputation: 95, level: 5 }, []);
  expect(newAchievements.length).toBeGreaterThanOrEqual(3);
});

test("unlockedAchievements accumulates across days rather than resetting", () => {
  const day1 = checkAchievements({ dailyReport: { profit: 1 } }, []);
  const day2 = checkAchievements({ reputation: 95 }, day1.unlockedAchievements);
  expect(day2.unlockedAchievements).toEqual(expect.arrayContaining(["first_profit", "five_star_reputation"]));
});

test("a throwing condition is treated as not met rather than crashing the whole call", () => {
  expect(() => checkAchievements(null, [])).not.toThrow();
});

test("never throws with no arguments at all", () => {
  expect(() => checkAchievements()).not.toThrow();
});
