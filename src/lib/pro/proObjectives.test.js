import { PRO_OBJECTIVE_CATALOG, seedProObjectives, evaluateProObjectives, objectivesProgress } from "./proObjectives";

test("catalog covers every department", () => {
  const kpis = PRO_OBJECTIVE_CATALOG.map((o) => o.kpi);
  expect(kpis).toEqual(
    expect.arrayContaining([
      "ebitdaMargin",
      "occupancyRate",
      "rmAdvanced.directShare",
      "restaurantAdvanced.grossMargin",
      "staff.morale",
      "marketing.reputation",
      "esg.score",
      "housekeeping.quality",
      "clients.satisfaction",
      "score.total",
    ])
  );
});

test("seedProObjectives marks every objective as not achieved", () => {
  const objectives = seedProObjectives();
  expect(objectives.every((o) => o.achieved === false)).toBe(true);
  expect(objectives).toHaveLength(PRO_OBJECTIVE_CATALOG.length);
});

test("evaluateProObjectives marks an objective achieved once its KPI clears the target", () => {
  const objectives = [{ id: "occupancy-70", kpi: "occupancyRate", comparator: "gte", target: 70, weight: 1 }];
  const result = evaluateProObjectives(objectives, { occupancyRate: 80 });
  expect(result[0].achieved).toBe(true);
});

test("evaluateProObjectives leaves an objective unmet when the KPI falls short", () => {
  const objectives = [{ id: "occupancy-70", kpi: "occupancyRate", comparator: "gte", target: 70, weight: 1 }];
  const result = evaluateProObjectives(objectives, { occupancyRate: 50 });
  expect(result[0].achieved).toBe(false);
});

test("objectivesProgress computes the achieved percentage", () => {
  const objectives = [{ achieved: true }, { achieved: true }, { achieved: false }, { achieved: false }];
  expect(objectivesProgress(objectives)).toBe(50);
});

test("objectivesProgress returns 0 for an empty list", () => {
  expect(objectivesProgress([])).toBe(0);
});
