import { runProAudits, overallAuditScore } from "./proAudits";

function snapshot(overrides = {}) {
  return {
    occupancyRate: 70,
    finance: { ebitdaMargin: 0.1, cash: 5000 },
    staff: { morale: 65, overload: 30 },
    marketing: { reputation: 60 },
    esg: { score: 60 },
    restaurantAdvanced: { grossMargin: 62, foodCost: 28 },
    rmAdvanced: { avgCompression: 65, otaShare: 30, directShare: 55 },
    clients: { satisfaction: 72, loyalty: 55 },
    ...overrides,
  };
}

test("runs one audit per department", () => {
  const audits = runProAudits(snapshot());
  const departments = audits.map((a) => a.department);
  expect(departments).toEqual(["finance", "rm", "fb", "staff", "esg", "clients"]);
});

test("every audit has a score, grade and findings", () => {
  const audits = runProAudits(snapshot());
  audits.forEach((audit) => {
    expect(audit.score).toBeGreaterThanOrEqual(0);
    expect(audit.score).toBeLessThanOrEqual(100);
    expect(typeof audit.grade).toBe("string");
    expect(Array.isArray(audit.findings)).toBe(true);
  });
});

test("a negative EBITDA margin flags a finance finding", () => {
  const audits = runProAudits(snapshot({ finance: { ebitdaMargin: -0.05, cash: 5000 } }));
  const finance = audits.find((a) => a.department === "finance");
  expect(finance.findings.some((f) => /négative/i.test(f))).toBe(true);
});

test("a high OTA share flags an RM finding", () => {
  const audits = runProAudits(snapshot({ rmAdvanced: { avgCompression: 60, otaShare: 70, directShare: 25 } }));
  const rm = audits.find((a) => a.department === "rm");
  expect(rm.findings.some((f) => /OTA/.test(f))).toBe(true);
});

test("a low loyalty flags a clients finding", () => {
  const audits = runProAudits(snapshot({ clients: { satisfaction: 72, loyalty: 30 } }));
  const clients = audits.find((a) => a.department === "clients");
  expect(clients.findings.some((f) => /fidélité/i.test(f))).toBe(true);
});

test("overallAuditScore averages every department's score", () => {
  const audits = [{ score: 60 }, { score: 80 }];
  expect(overallAuditScore(audits)).toBe(70);
});

test("overallAuditScore returns null for an empty list", () => {
  expect(overallAuditScore([])).toBeNull();
});
