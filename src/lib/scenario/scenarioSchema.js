// Format, defaults and validation for a Scenario -- see the Scenario
// Builder Blueprint (section B) for the full field-by-field reference.
// Deliberately smaller than the blueprint's UI-authoring surface: this
// implementation covers what the engine and Academy module need to load,
// run and score a scenario, not a full drafting workflow.
import { safeArray, safeNumber, safeObject, safeString } from "../safe";

export const SCENARIO_MODES = ["solo", "academie", "competition", "professionnel"];
export const SCENARIO_STATUS = ["draft", "published", "archived"];
const DURATION_UNITS = ["days", "weeks", "months", "years"];
const CYCLES_PER_UNIT = { days: 1, weeks: 7, months: 30, years: 365 };

export function resolveDurationToCycles(duration) {
  const d = safeObject(duration);
  const unit = DURATION_UNITS.includes(d.unit) ? d.unit : "days";
  return Math.max(1, Math.round(safeNumber(d.value, 1) * CYCLES_PER_UNIT[unit]));
}

function defaultScoring() {
  return {
    weights: { finance: 0.3, rm: 0.2, reputation: 0.2, esg: 0.1, objectives: 0.2 },
    penalties: [],
    maxScore: 100,
  };
}

function defaultEvaluation() {
  return {
    passingScore: 50,
    grading: [
      { minScore: 0, maxScore: 49, grade: "D", label: "Insuffisant" },
      { minScore: 50, maxScore: 69, grade: "C", label: "Satisfaisant" },
      { minScore: 70, maxScore: 84, grade: "B", label: "Bien" },
      { minScore: 85, maxScore: 100, grade: "A", label: "Excellent" },
    ],
    rubric: [],
  };
}

// Builds a minimal, always-valid draft for a given mode -- used both by
// scenarioBuilder.js and directly by Academy when a teacher assigns a
// scenario without going through a full authoring UI.
export function createScenarioTemplate(mode = "solo", overrides = {}) {
  const safeMode = SCENARIO_MODES.includes(mode) ? mode : "solo";
  const now = new Date().toISOString();
  return {
    id: overrides.id || `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "Nouveau scénario",
    description: "",
    author: { userId: null, name: "" },
    mode: safeMode,
    initialState: { source: "template" },
    constraints: {},
    objectives: [],
    events: [],
    duration: { unit: "days", value: 14 },
    scoring: defaultScoring(),
    evaluation: defaultEvaluation(),
    replay: { recordDecisions: true, recordCycleReports: true, seed: safeMode === "competition" ? `seed-${Date.now()}` : null },
    metadata: { tags: [], difficulty: "debutant", version: 1, language: "fr", status: "draft", createdAt: now, updatedAt: now },
    ...overrides,
  };
}

// Validates a Scenario object, returning every error at once (never
// throws) so a caller (ScenarioBuilder UI, or Academy's assignment flow)
// can report every problem in one pass.
export function validateScenario(scenario) {
  const s = safeObject(scenario);
  const errors = [];

  if (!safeString(s.id).trim()) errors.push({ path: "id", message: "L'identifiant du scénario est obligatoire." });
  if (!safeString(s.title).trim()) errors.push({ path: "title", message: "Le titre est obligatoire." });
  if (!SCENARIO_MODES.includes(s.mode)) errors.push({ path: "mode", message: `Le mode doit être l'un de : ${SCENARIO_MODES.join(", ")}.` });
  if (!safeArray(s.objectives).length) errors.push({ path: "objectives", message: "Au moins un objectif est requis." });
  if (!safeObject(s.duration).value) errors.push({ path: "duration", message: "La durée est obligatoire." });
  if (s.mode === "competition" && !safeObject(s.replay).seed) errors.push({ path: "replay.seed", message: "Une graine (seed) est obligatoire pour un scénario de compétition." });

  return { valid: errors.length === 0, errors };
}

const scenarioSchema = { SCENARIO_MODES, SCENARIO_STATUS, createScenarioTemplate, validateScenario, resolveDurationToCycles };
export default scenarioSchema;
