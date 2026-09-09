import {
  PRO_PHASE_CATALOG,
  PRO_MISSION_CATALOG,
  seedPhases,
  seedProMissions,
  evaluateProMissions,
  missionsJustCompleted,
  findCurrentPhase,
  computePhaseProgress,
} from "./proMissions";

test("catalog has 4 phases covering 24 months", () => {
  expect(PRO_PHASE_CATALOG).toHaveLength(4);
  expect(PRO_PHASE_CATALOG[0].startMonth).toBe(1);
  expect(PRO_PHASE_CATALOG[PRO_PHASE_CATALOG.length - 1].endMonth).toBe(24);
});

test("seedProMissions auto-accepts every mission", () => {
  const missions = seedProMissions();
  expect(missions.every((m) => m.status === "accepted" && m.achieved === false)).toBe(true);
  expect(missions).toHaveLength(PRO_MISSION_CATALOG.length);
});

test("evaluateProMissions completes a mission once its KPI clears the target", () => {
  const missions = seedProMissions();
  const snapshot = { ebitdaMargin: 0.05 };
  const result = evaluateProMissions(missions, snapshot, 3);
  const stableLaunch = result.find((m) => m.id === "stable-launch");
  expect(stableLaunch.achieved).toBe(true);
  expect(stableLaunch.completedOnMonth).toBe(3);
});

test("evaluateProMissions leaves an already-achieved mission untouched", () => {
  const missions = [{ id: "stable-launch", kpi: "ebitdaMargin", target: 0, achieved: true, completedOnMonth: 2 }];
  const result = evaluateProMissions(missions, { ebitdaMargin: -1 }, 5);
  expect(result[0].completedOnMonth).toBe(2);
});

test("missionsJustCompleted returns only newly achieved missions", () => {
  const previous = [{ id: "a", achieved: false }, { id: "b", achieved: true }];
  const next = [{ id: "a", achieved: true }, { id: "b", achieved: true }];
  expect(missionsJustCompleted(previous, next)).toEqual([{ id: "a", achieved: true }]);
});

test("findCurrentPhase resolves the phase for a given month", () => {
  expect(findCurrentPhase(1).id).toBe("phase-1");
  expect(findCurrentPhase(10).id).toBe("phase-2");
  expect(findCurrentPhase(24).id).toBe("phase-4");
});

test("computePhaseProgress computes overall and phase-level progress", () => {
  const progress = computePhaseProgress(12, 24);
  expect(progress.currentPhase.id).toBe("phase-2");
  expect(progress.overallProgress).toBe(50);
  expect(progress.phaseProgress).toBeGreaterThan(0);
});
