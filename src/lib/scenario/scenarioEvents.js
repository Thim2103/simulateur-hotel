// Resolves a scenario's own programmed/conditional events for the current
// cycle, on top of whatever eventEngine.generateEvents() already rolled.
import { safeArray, safeObject } from "../safe";

function evaluateCondition(condition, state) {
  if (typeof condition !== "function") return false;
  try {
    return Boolean(condition(state));
  } catch {
    return false;
  }
}

// events: the scenario's own Scenario.events array (scheduled/conditional).
// triggeredIds: ids already fired for this run, so onceOnly events don't
// repeat every cycle their condition stays true.
export function resolveEventsForCycle({ cycleIndex, state, events, triggeredIds = new Set() }) {
  const list = safeArray(events);
  const resolved = [];

  list.forEach((event) => {
    const e = safeObject(event);
    if (e.kind === "scheduled" && e.cycleIndex === cycleIndex) {
      resolved.push(e);
      return;
    }
    if (e.kind === "conditional") {
      if (e.onceOnly && triggeredIds.has(e.id)) return;
      if (evaluateCondition(e.condition, state)) resolved.push(e);
    }
  });

  return resolved;
}

// Merges the scenario's own resolved events with eventEngine's own list,
// de-duplicating by id so an event id used both places is never counted
// twice by scenarioScoring's penalties.
export function mergeWithEngineEvents(scenarioEvents, engineEvents) {
  const seen = new Set();
  const merged = [];
  [...safeArray(scenarioEvents), ...safeArray(engineEvents)].forEach((event) => {
    const id = safeObject(event).id ?? safeObject(event).eventId;
    if (id !== undefined && seen.has(id)) return;
    if (id !== undefined) seen.add(id);
    merged.push(event);
  });
  return merged;
}
