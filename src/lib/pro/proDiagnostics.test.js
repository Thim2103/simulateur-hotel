import { generateProDiagnostics } from "./proDiagnostics";

function baseArgs(overrides = {}) {
  return {
    moduleDiagnostics: [],
    score: 65,
    cash: 5000,
    month: 6,
    horizonMonths: 24,
    phaseProgress: { currentPhase: { title: "Phase 1" }, phaseProgress: 40 },
    missionsCompletedCount: 1,
    missionsTotalCount: 8,
    activeCrisesCount: 0,
    auditFailures: [],
    ...overrides,
  };
}

test("returns only the module diagnostics for a healthy mid-run cycle", () => {
  expect(generateProDiagnostics(baseArgs())).toEqual([]);
});

test("flags a critical global score", () => {
  const diagnostics = generateProDiagnostics(baseArgs({ score: 30 }));
  expect(diagnostics.some((d) => d.type === "error" && d.severity === "high")).toBe(true);
});

test("flags an excellent global score as an opportunity", () => {
  const diagnostics = generateProDiagnostics(baseArgs({ score: 90 }));
  expect(diagnostics.some((d) => d.type === "opportunity")).toBe(true);
});

test("flags exhausted cash before the horizon ends", () => {
  const diagnostics = generateProDiagnostics(baseArgs({ cash: -100, month: 10, horizonMonths: 24 }));
  expect(diagnostics.some((d) => d.type === "error" && /trésorerie/i.test(d.message))).toBe(true);
});

test("flags no missions completed at the halfway point", () => {
  const diagnostics = generateProDiagnostics(baseArgs({ month: 12, horizonMonths: 24, missionsCompletedCount: 0, missionsTotalCount: 8 }));
  expect(diagnostics.some((d) => /mi-parcours/i.test(d.message))).toBe(true);
});

test("flags a phase ending with incomplete missions", () => {
  const diagnostics = generateProDiagnostics(baseArgs({ phaseProgress: { currentPhase: { title: "Phase 1" }, phaseProgress: 95 }, missionsCompletedCount: 1, missionsTotalCount: 8 }));
  expect(diagnostics.some((d) => /touche à sa fin/i.test(d.message))).toBe(true);
});

test("flags multiple simultaneous crises as high severity", () => {
  const diagnostics = generateProDiagnostics(baseArgs({ activeCrisesCount: 3 }));
  expect(diagnostics.some((d) => d.type === "error" && d.severity === "high" && /crises actives/i.test(d.message))).toBe(true);
});

test("flags a single active crisis as medium severity", () => {
  const diagnostics = generateProDiagnostics(baseArgs({ activeCrisesCount: 1 }));
  expect(diagnostics.some((d) => d.severity === "medium" && /crise/i.test(d.message))).toBe(true);
});

test("flags failing audits", () => {
  const diagnostics = generateProDiagnostics(baseArgs({ auditFailures: [{ department: "finance", score: 30, grade: "F" }] }));
  expect(diagnostics.some((d) => /audit finance en échec/i.test(d.message))).toBe(true);
});
