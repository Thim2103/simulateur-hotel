import { generateProReport, exportProReportHtml } from "./proReport";

function proState(overrides = {}) {
  return {
    proId: "pro-1",
    status: "completed",
    hotelConfig: { positioningTier: "midscale", roomCount: 30, strategy: "optimisation" },
    month: 24,
    horizonMonths: 24,
    performanceHistory: [{ month: 24, score: 78, ebitdaMargin: 0.12, occupancyRate: 72, risks: 1, opportunities: 2 }],
    phases: [{ id: "phase-1", title: "Phase 1" }],
    missions: [{ id: "m1", title: "Lancement stable", achieved: true }],
    objectives: [{ id: "o1", label: "Rester rentable", achieved: true }],
    crises: [{ id: "inflation", title: "Inflation", department: "finance", active: false }],
    opportunities: [{ id: "subvention", title: "Subvention", status: "seized", roiEstimate: 12000 }],
    audits: [{ department: "finance", score: 75, grade: "B", month: 24, findings: [] }],
    diagnostics: [{ type: "opportunity", severity: "low", message: "Bonne trajectoire." }],
    forecast: { horizonMonths: 24, scenarios: {} },
    score: { total: 78, grade: "B" },
    ...overrides,
  };
}

test("assembles the full report shape", () => {
  const report = generateProReport(proState());
  expect(report.finalScore).toEqual({ total: 78, grade: "B" });
  expect(report.grade).toBe("B");
  expect(report.monthsPlayed).toBe(24);
  expect(report.overallAuditScore).toBe(75);
});

test("activeCrises only includes still-active crises", () => {
  const report = generateProReport(proState());
  expect(report.activeCrises).toEqual([]);
});

test("availableOpportunities excludes seized ones", () => {
  const report = generateProReport(proState());
  expect(report.availableOpportunities).toEqual([]);
});

test("recommendations filter to high-severity or opportunity diagnostics", () => {
  const report = generateProReport(proState({ diagnostics: [{ type: "opportunity", severity: "low", message: "A" }, { type: "anomaly", severity: "low", message: "B" }] }));
  expect(report.recommendations).toHaveLength(1);
  expect(report.recommendations[0].message).toBe("A");
});

test("exportProReportHtml produces a self-contained HTML document", () => {
  const report = generateProReport(proState());
  const html = exportProReportHtml(report);
  expect(html).toContain("<!doctype html>");
  expect(html).toContain("Rapport final -- Mode Professionnel Solo");
  expect(html).toContain("78/100");
});

test("exportProReportHtml never throws on an empty report", () => {
  expect(() => exportProReportHtml({})).not.toThrow();
});
