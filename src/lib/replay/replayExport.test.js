import { buildExportPayload, buildSummaryHtml, toJson } from "./replayExport";

function run(overrides = {}) {
  return {
    id: "academie-c1-g1",
    source: "academie",
    ownerLabel: "Groupe A",
    scenarioTitle: "Budget serré",
    status: "finished",
    totalCycles: 2,
    scoreHistory: [40, 70],
    finalReport: { finalScore: 70, grade: "B" },
    cycles: [
      { cycleIndex: 0, score: 40, baseReport: { profit: 500 }, scenarioEvents: [{ id: "rush" }] },
      { cycleIndex: 1, score: 70, baseReport: { profit: 900 }, scenarioEvents: [] },
    ],
    ...overrides,
  };
}

test("buildExportPayload includes the run's identity, KPI series and event frequency", () => {
  const payload = buildExportPayload(run());
  expect(payload).toEqual(
    expect.objectContaining({
      id: "academie-c1-g1",
      ownerLabel: "Groupe A",
      finalReport: { finalScore: 70, grade: "B" },
      eventFrequency: { rush: 1 },
      exportedAt: expect.any(String),
    })
  );
  expect(payload.kpiSeries.profit).toEqual([500, 900]);
});

test("toJson produces valid, parseable JSON matching the export payload", () => {
  const json = toJson(run());
  const parsed = JSON.parse(json);
  expect(parsed.id).toBe("academie-c1-g1");
  expect(parsed.scoreHistory).toEqual([40, 70]);
});

test("buildSummaryHtml renders the owner, scenario, final score and an event table", () => {
  const html = buildSummaryHtml(run());
  expect(html).toContain("Groupe A");
  expect(html).toContain("Budget serré");
  expect(html).toContain("70");
  expect(html).toContain("rush");
});

test("buildSummaryHtml handles a run with no events without throwing", () => {
  const html = buildSummaryHtml(run({ cycles: [{ cycleIndex: 0, score: 40, baseReport: {}, scenarioEvents: [] }] }));
  expect(html).toContain("Aucun");
});
