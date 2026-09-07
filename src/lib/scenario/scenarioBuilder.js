// Draft-editing helpers for authoring a Scenario -- immutable, UI-facing.
// This module intentionally stays small: Hospitality Lab does not yet ship
// a full Scenario Builder UI (see the Scenario Builder Blueprint); Academy
// assigns scenarios built from createScenarioTemplate() or a hand-authored
// object, both of which already satisfy scenarioSchema.
import { safeObject } from "../safe";
import { createScenarioTemplate, validateScenario } from "./scenarioSchema";

export function createDraft(mode = "solo") {
  return createScenarioTemplate(mode);
}

export function updateDraftField(draft, path, value) {
  const segments = String(path).split(".");
  if (segments.length === 1) return { ...draft, [segments[0]]: value };
  const [head, ...rest] = segments;
  return { ...draft, [head]: { ...safeObject(draft[head]), ...updateDraftField(safeObject(draft[head]), rest.join("."), value) } };
}

export function addObjective(draft, objective) {
  return { ...draft, objectives: [...(draft.objectives || []), objective] };
}

export function addEvent(draft, event) {
  return { ...draft, events: [...(draft.events || []), event] };
}

export function setScoring(draft, scoring) {
  return { ...draft, scoring: { ...safeObject(draft.scoring), ...scoring } };
}

export function previewScenario(draft) {
  const { valid, errors } = validateScenario(draft);
  return { estimatedCycles: draft?.duration?.value || 0, warnings: valid ? [] : errors.map((error) => error.message) };
}

// Validates and stamps the draft as published. Returns the errors instead
// of throwing so the caller (a form) can render them inline.
export function publish(draft) {
  const { valid, errors } = validateScenario(draft);
  if (!valid) return { scenario: draft, errors };
  const now = new Date().toISOString();
  return { scenario: { ...draft, metadata: { ...safeObject(draft.metadata), status: "published", updatedAt: now } }, errors: [] };
}
