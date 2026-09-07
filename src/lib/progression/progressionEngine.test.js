import { runProgression } from "./progressionEngine";

function state(overrides = {}) {
  return {
    hotelState: { esg: { sustainabilityScore: 60 }, progression: {} },
    restaurantState: { staff: [{ id: 1, satisfaction: 70 }], operations: [] },
    rooms: [{ id: 1 }],
    dailyReport: { profit: 100, events: [], hotelRevenue: { occupiedRooms: 1, upsellRevenue: 0 } },
    ...overrides,
  };
}

test("returns a progressionReport with exactly the documented shape", () => {
  const { report } = runProgression(state());
  expect(report).toEqual({
    reputation: expect.any(Number),
    xp: expect.any(Number),
    level: expect.objectContaining({ level: expect.any(Number), title: expect.any(String) }),
    objectivesCompleted: expect.any(Array),
    newAchievements: expect.any(Array),
    rewards: expect.any(Array),
    storylineEvents: expect.any(Array),
  });
});

test("runs the pipeline in the documented order: reputation feeds achievements/storyline, xp feeds level, and level/achievements feed rewards", () => {
  // A day that pushes reputation to 90+ should both report that reputation
  // AND unlock the five-star achievement in the same pass, plus a reward
  // for it -- proving the later steps actually saw the earlier ones' output.
  const { report } = runProgression(
    state({
      hotelState: { esg: { sustainabilityScore: 100 }, progression: { player: { reputation: 90 } } },
      restaurantState: { staff: [{ id: 1, satisfaction: 100 }], operations: [] },
    })
  );

  expect(report.reputation).toBeGreaterThanOrEqual(90);
  expect(report.newAchievements.some((a) => a.id === "five_star_reputation")).toBe(true);
  expect(report.rewards.some((r) => r.id === "achievement_five_star_reputation")).toBe(true);
});

test("a level-up produces both a reward and a storyline beat", () => {
  // Starting near a level threshold with a big XP-granting day pushes the
  // player across it.
  const { report } = runProgression(state({ hotelState: { progression: { player: { xp: 90 } } }, dailyReport: { profit: 10000, events: [] } }));
  expect(report.level.level).toBeGreaterThan(1);
  expect(report.rewards.some((r) => r.type === "capital")).toBe(true);
  expect(report.storylineEvents.some((e) => e.id.startsWith("level_up"))).toBe(true);
});

test("returns a player snapshot to persist for tomorrow", () => {
  const { player } = runProgression(state());
  expect(player).toEqual({
    xp: expect.any(Number),
    level: expect.any(Number),
    reputation: expect.any(Number),
    unlockedAchievements: expect.any(Array),
  });
});

test("carries yesterday's player state forward instead of resetting each day", () => {
  const { player: day1Player } = runProgression(state());
  const { report: day2Report, player: day2Player } = runProgression(
    state({ hotelState: { esg: { sustainabilityScore: 60 }, progression: { cycles: 1, player: day1Player } } })
  );

  expect(day2Report.xp).toBeGreaterThan(day1Player.xp);
  expect(day2Player.xp).toBe(day2Report.xp);
});

test("returns the incremented day counter for the caller to persist", () => {
  const { cycles } = runProgression(state({ hotelState: { progression: { cycles: 4 } } }));
  expect(cycles).toBe(5);
});

test("an achievement unlocked yesterday is not re-unlocked today", () => {
  const { report } = runProgression(
    state({ hotelState: { progression: { player: { unlockedAchievements: ["first_profit"] } } } })
  );
  expect(report.newAchievements.some((a) => a.id === "first_profit")).toBe(false);
});

test("never throws with no arguments at all", () => {
  expect(() => runProgression()).not.toThrow();
});
