import {
  seedChapters,
  seedTfeMissions,
  seedTfeObjectives,
  evaluateTfeMissions,
  evaluateTfeObjectives,
  missionsJustCompleted,
  findCurrentChapter,
  computeChapterProgress,
  TFE_CHAPTER_CATALOG,
  TFE_MISSION_CATALOG,
  TFE_OBJECTIVE_CATALOG,
} from "./tfeStoryline";

test("seedChapters/seedTfeMissions/seedTfeObjectives mirror their catalogs", () => {
  expect(seedChapters()).toHaveLength(TFE_CHAPTER_CATALOG.length);
  expect(seedTfeMissions()).toHaveLength(TFE_MISSION_CATALOG.length);
  expect(seedTfeObjectives()).toHaveLength(TFE_OBJECTIVE_CATALOG.length);
});

test("seedTfeMissions() starts every mission accepted, not achieved", () => {
  const missions = seedTfeMissions();
  missions.forEach((mission) => {
    expect(mission.status).toBe("accepted");
    expect(mission.achieved).toBe(false);
  });
});

describe("evaluateTfeMissions", () => {
  test("marks a mission achieved once its KPI is reached", () => {
    const missions = seedTfeMissions();
    const snapshot = { ebitdaMargin: 0.1, staff: { morale: 80 }, esg: { score: 80 }, marketing: { reputation: 80 }, housekeeping: { quality: 80 }, score: { total: 80 } };
    const next = evaluateTfeMissions(missions, snapshot, 3);
    expect(next.every((mission) => mission.achieved)).toBe(true);
    expect(next[0].completedOnMonth).toBe(3);
  });

  test("leaves a mission unachieved when its KPI isn't reached", () => {
    const missions = seedTfeMissions();
    const snapshot = { ebitdaMargin: -0.1, staff: { morale: 10 }, esg: { score: 10 }, marketing: { reputation: 10 }, housekeeping: { quality: 10 }, score: { total: 10 } };
    const next = evaluateTfeMissions(missions, snapshot, 3);
    expect(next.every((mission) => !mission.achieved)).toBe(true);
  });

  test("an already-achieved mission stays achieved even if the KPI later regresses", () => {
    const missions = seedTfeMissions().map((mission) => ({ ...mission, achieved: true, status: "completed", completedOnMonth: 2 }));
    const snapshot = { ebitdaMargin: -1, staff: { morale: 0 }, esg: { score: 0 }, marketing: { reputation: 0 }, housekeeping: { quality: 0 }, score: { total: 0 } };
    const next = evaluateTfeMissions(missions, snapshot, 5);
    expect(next.every((mission) => mission.achieved && mission.completedOnMonth === 2)).toBe(true);
  });
});

describe("evaluateTfeObjectives", () => {
  test("marks objectives achieved/unachieved from the same snapshot shape", () => {
    const objectives = seedTfeObjectives();
    const snapshot = { ebitdaMargin: 0.05, occupancyRate: 80, esg: { score: 60 }, staff: { morale: 60 } };
    const next = evaluateTfeObjectives(objectives, snapshot);
    expect(next.every((objective) => objective.achieved)).toBe(true);
  });
});

test("missionsJustCompleted returns only the newly achieved ones", () => {
  const before = seedTfeMissions();
  const after = before.map((mission, index) => (index === 0 ? { ...mission, achieved: true } : mission));
  const justCompleted = missionsJustCompleted(before, after);
  expect(justCompleted).toHaveLength(1);
  expect(justCompleted[0].id).toBe(before[0].id);
});

describe("findCurrentChapter", () => {
  test("resolves the chapter matching a given month", () => {
    expect(findCurrentChapter(1).id).toBe("annee-1");
    expect(findCurrentChapter(15).id).toBe("annee-2");
    expect(findCurrentChapter(36).id).toBe("annee-3");
  });
});

describe("computeChapterProgress", () => {
  test("computes overall and chapter-scoped progress", () => {
    const progress = computeChapterProgress(18, 36);
    expect(progress.overallProgress).toBe(50);
    expect(progress.currentChapter.id).toBe("annee-2");
    expect(progress.chapterProgress).toBeGreaterThan(0);
    expect(progress.chapterProgress).toBeLessThanOrEqual(100);
  });

  test("reaches 100% overall at the final month", () => {
    const progress = computeChapterProgress(36, 36);
    expect(progress.overallProgress).toBe(100);
  });
});
