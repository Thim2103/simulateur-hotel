// Rolls every event definition against today's state, keeps multi-day
// events going until their duration runs out, and returns the combined
// impact for the rest of the daily cycle pipeline to apply.
import { EVENT_DEFINITIONS } from "./eventDefinitions";
import { emptyImpact, resolveDuration, resolveImpact, rollProbability, sumImpacts, toDateOnly } from "./eventUtils";

// hotelState/restaurantState/pmsState: the same composite context passed to
// lib/dailyCycle's other steps. activeEvents: the still-ongoing multi-day
// events from the previous call (see runDailyCycle.js, which persists this
// in hotelState.progression.activeEvents across days).
export function generateEvents({ hotelState = {}, restaurantState = {}, pmsState = {}, activeEvents = [], referenceDate = new Date(), rng = Math.random } = {}) {
  const state = { hotelState, restaurantState, pmsState };

  // 1. Advance events already in progress: each still contributes its
  // per-day impact for as long as it remains active.
  const continuing = [];
  const continuingImpacts = [];
  (Array.isArray(activeEvents) ? activeEvents : []).forEach((event) => {
    continuingImpacts.push(event.impact || emptyImpact());
    const remainingDays = Number(event.remainingDays || 0) - 1;
    if (remainingDays > 0) continuing.push({ ...event, remainingDays });
  });

  // 2. Roll new events. A definition already active (from step 1) is
  // skipped for today -- no two concurrent power outages, for instance.
  const activeIds = new Set(continuing.map((event) => event.id));
  const triggered = [];
  const triggeredImpacts = [];

  EVENT_DEFINITIONS.forEach((definition) => {
    if (activeIds.has(definition.id)) return;
    if (!definition.conditions(state)) return;
    if (!rollProbability(definition.probability(state), rng)) return;

    const context = { rng, referenceDate, variant: null };
    const applied = definition.apply(state, context) || {};
    const impact = resolveImpact(definition.impact, state, context);
    const duration = resolveDuration(definition.duration, state, context);

    triggered.push({
      id: definition.id,
      name: definition.name,
      category: definition.category,
      message: applied.message || definition.name,
      severity: applied.severity || "medium",
      impact,
      remainingDays: duration,
      totalDays: duration,
      startedOn: toDateOnly(referenceDate),
    });
    triggeredImpacts.push(impact);
  });

  const events = [...continuing, ...triggered];

  return {
    // Every event still in effect today (continuing + newly triggered),
    // in the shape the DailyReport/UI expects.
    events,
    // Just the ones that started today, for callers that want to
    // distinguish "new today" from "still ongoing".
    triggeredEvents: triggered,
    impacts: sumImpacts([...continuingImpacts, ...triggeredImpacts]),
    // Persist this for tomorrow's call (see runDailyCycle.js).
    activeEvents: events,
  };
}

export const eventEngine = { generateEvents };
export default eventEngine;
