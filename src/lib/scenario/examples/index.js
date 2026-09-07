// Ready-made scenarios: fixtures for tests, and the presets Academy lets a
// teacher assign without a full authoring UI (see the Scenario Builder
// Blueprint, section K, for the full 5-scenario set this is a start on).
import { createScenarioTemplate } from "../scenarioSchema";

export const demoScenario = createScenarioTemplate("solo", {
  id: "demo-14-jours",
  title: "Découverte — 14 jours",
  description: "Premier contact avec le moteur : contraintes minimales, objectifs simples.",
  objectives: [
    { id: "profit", label: "Profit total positif", kpi: "profit", comparator: "gte", target: 0, weight: 2, required: true },
  ],
  duration: { unit: "days", value: 14 },
  metadata: { tags: ["demo"], difficulty: "debutant", version: 1, language: "fr", status: "published" },
});

export const academyScenario = createScenarioTemplate("academie", {
  id: "academie-budget-serre",
  title: "Budget serré — 6 mois",
  description: "Un budget de départ contraint et un objectif de rentabilité à tenir sur la durée.",
  constraints: { budget: { startingCash: 15000, maxDebt: 5000 } },
  objectives: [
    { id: "profit", label: "Profit cumulé positif", kpi: "profit", comparator: "gte", target: 0, weight: 2, required: true },
    { id: "reputation", label: "Réputation ≥ 60", kpi: "progressionReport.reputation", comparator: "gte", target: 60, weight: 1, required: false },
  ],
  duration: { unit: "months", value: 6 },
  evaluation: {
    passingScore: 55,
    grading: [
      { minScore: 0, maxScore: 54, grade: "D", label: "Insuffisant" },
      { minScore: 55, maxScore: 74, grade: "C", label: "Satisfaisant" },
      { minScore: 75, maxScore: 89, grade: "B", label: "Bien" },
      { minScore: 90, maxScore: 100, grade: "A", label: "Excellent" },
    ],
    rubric: [{ criterion: "Maîtrise du budget", weight: 0.5 }, { criterion: "Réputation client", weight: 0.5 }],
  },
  metadata: { tags: ["academie"], difficulty: "intermediaire", version: 1, language: "fr", status: "published" },
});

export const academyExampleScenarios = [demoScenario, academyScenario];
