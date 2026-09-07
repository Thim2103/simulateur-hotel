import { generateRecommendations, topRecommendations } from "./analyticsRecommendations";

function diag(type, severity, message, cycleIndex = null) {
  return { type, severity, message, cycleIndex };
}

test("generateRecommendations ranks by severity, highest first", () => {
  const diagnostics = [diag("opportunity", "low", "essayer X"), diag("error", "high", "corriger Y"), diag("anomaly", "medium", "vérifier Z")];
  const recommendations = generateRecommendations(diagnostics);
  expect(recommendations.map((r) => r.severity)).toEqual(["high", "medium", "low"]);
});

test("generateRecommendations phrases each type with its own template", () => {
  const [error] = generateRecommendations([diag("error", "high", "budget dépassé")]);
  expect(error.text).toContain("Corriger en priorité");
  expect(error.text).toContain("budget dépassé");

  const [opportunity] = generateRecommendations([diag("opportunity", "low", "levier marketing inutilisé")]);
  expect(opportunity.text).toContain("À essayer");
});

test("generateRecommendations returns an empty list for no diagnostics", () => {
  expect(generateRecommendations([])).toEqual([]);
  expect(generateRecommendations(null)).toEqual([]);
});

test("topRecommendations caps the list at the given count, after ranking", () => {
  const diagnostics = [diag("opportunity", "low", "a"), diag("error", "high", "b"), diag("anomaly", "medium", "c"), diag("error", "high", "d")];
  const top = topRecommendations(diagnostics, 2);
  expect(top).toHaveLength(2);
  expect(top.every((r) => r.severity === "high")).toBe(true);
});
