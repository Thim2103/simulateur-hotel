import { generateTfeReport, exportTfeReportHtml } from "./tfeReport";

function tfeStateFixture(overrides = {}) {
  return {
    tfeId: "tfe-1",
    status: "completed",
    hotelConfig: { name: "Riviera Test", positioningTier: "upscale", roomCount: 30, strategy: "croissance" },
    month: 36,
    horizonMonths: 36,
    score: { total: 78, grade: "B" },
    performanceHistory: [
      { month: 35, score: 76, ebitdaMargin: 0.12, occupancyRate: 70, risks: 1, opportunities: 2 },
      { month: 36, score: 78, ebitdaMargin: 0.14, occupancyRate: 74, risks: 0, opportunities: 3 },
    ],
    chapters: [{ id: "annee-1", title: "Année 1 : Lancement" }],
    missions: [{ id: "m1", title: "Lancement stable", achieved: true }, { id: "m2", title: "Cohésion d'équipe", achieved: false }],
    objectives: [{ id: "o1", label: "Rester rentable", achieved: true }],
    diagnostics: [
      { type: "error", severity: "high", message: "Trésorerie tendue." },
      { type: "opportunity", severity: "low", message: "Bonne dynamique ESG." },
    ],
    forecast: { horizonMonths: 36, scenarios: {} },
    ...overrides,
  };
}

describe("generateTfeReport", () => {
  test("assembles every section from the TfeState", () => {
    const report = generateTfeReport(tfeStateFixture());
    expect(report.status).toBe("completed");
    expect(report.finalScore.total).toBe(78);
    expect(report.grade).toBe("B");
    expect(report.latest.month).toBe(36);
    expect(report.performanceHistory).toHaveLength(2);
    expect(report.missions).toHaveLength(2);
  });

  test("recommendations only include high-severity or opportunity diagnostics", () => {
    const report = generateTfeReport(tfeStateFixture());
    expect(report.recommendations.every((d) => d.severity === "high" || d.type === "opportunity")).toBe(true);
  });

  test("safe on an empty/missing TfeState", () => {
    expect(() => generateTfeReport(null)).not.toThrow();
    const report = generateTfeReport(undefined);
    expect(report.performanceHistory).toEqual([]);
    expect(report.latest).toBeNull();
  });
});

describe("exportTfeReportHtml", () => {
  test("produces a self-contained HTML document with the score and hotel config", () => {
    const report = generateTfeReport(tfeStateFixture());
    const html = exportTfeReportHtml(report);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("78/100");
    expect(html).toContain("upscale");
    expect(html).toContain("Trésorerie tendue.");
  });

  test("safe on an empty report", () => {
    expect(() => exportTfeReportHtml({})).not.toThrow();
  });
});
