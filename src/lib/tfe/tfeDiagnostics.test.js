import { generateTfeDiagnostics } from "./tfeDiagnostics";

const HEALTHY = {
  moduleDiagnostics: [],
  score: 65,
  cash: 50000,
  month: 5,
  horizonMonths: 36,
  chapterProgress: { currentChapter: { title: "Année 1 : Lancement" }, chapterProgress: 40 },
  missionsCompletedCount: 1,
  missionsTotalCount: 6,
};

test("passes through the module diagnostics it was given", () => {
  const moduleDiagnostics = [{ type: "error", severity: "high", message: "Finance en difficulté." }];
  const diagnostics = generateTfeDiagnostics({ ...HEALTHY, moduleDiagnostics });
  expect(diagnostics).toEqual(expect.arrayContaining(moduleDiagnostics));
});

test("a critical score raises a high-severity error", () => {
  const diagnostics = generateTfeDiagnostics({ ...HEALTHY, score: 20 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "error", severity: "high" })]));
});

test("an excellent score raises an opportunity", () => {
  const diagnostics = generateTfeDiagnostics({ ...HEALTHY, score: 90 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "opportunity" })]));
});

test("exhausted cash with months remaining raises a high-severity error", () => {
  const diagnostics = generateTfeDiagnostics({ ...HEALTHY, cash: 0, month: 10 });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ type: "error", severity: "high" })]));
});

test("exhausted cash at the very last month does not raise the bankruptcy diagnostic", () => {
  const diagnostics = generateTfeDiagnostics({ ...HEALTHY, cash: 0, month: 36, horizonMonths: 36 });
  expect(diagnostics.some((d) => d.message.includes("faillite"))).toBe(false);
});

test("no missions completed at the halfway point is flagged", () => {
  const diagnostics = generateTfeDiagnostics({ ...HEALTHY, month: 18, horizonMonths: 36, missionsCompletedCount: 0, missionsTotalCount: 6 });
  expect(diagnostics.some((d) => d.message.includes("mi-parcours"))).toBe(true);
});

test("a chapter nearly over with incomplete missions is flagged", () => {
  const diagnostics = generateTfeDiagnostics({ ...HEALTHY, chapterProgress: { currentChapter: { title: "Année 1 : Lancement" }, chapterProgress: 95 }, missionsCompletedCount: 0, missionsTotalCount: 6 });
  expect(diagnostics.some((d) => d.message.includes("touche à sa fin"))).toBe(true);
});
