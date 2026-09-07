// Resolves a player's choice on a story event (see careerEvents.js's
// catalog) into its actual consequences, and keeps the storyline's
// history -- what happened, what the player chose, and why it mattered.
import { safeArray, safeNumber, safeObject } from "../safe";
import { findEventDefinition } from "./careerEvents";

// Applies a choice's consequence to the hotel's finance (a one-off cash
// delta, e.g. an accepted investment or a granted budget) -- deliberately
// narrow: storyline never touches occupancy/reservations/staff directly,
// only the numbers a narrative choice plausibly explains.
export function applyConsequenceToHotel(hotelState, consequence) {
  const delta = safeNumber(consequence?.cashDelta, 0);
  if (!delta) return hotelState;
  const finance = safeObject(hotelState?.finance);
  const revenue = safeArray(finance.revenue);
  const nextRevenue = revenue.length ? [...revenue] : [0];
  nextRevenue[nextRevenue.length - 1] = safeNumber(nextRevenue[nextRevenue.length - 1], 0) + delta;
  return { ...hotelState, finance: { ...finance, revenue: nextRevenue } };
}

// Resolves the choice: returns the updated storyline (history + no more
// "current" event) and the raw consequence for careerEngine.js to apply
// to hotel/skills/reputation.
export function resolveStoryChoice(storyline, eventId, choiceId, day) {
  const definition = findEventDefinition(eventId);
  const choice = definition?.choices?.find((entry) => entry.id === choiceId);
  if (!definition || !choice) return { storyline, consequence: null };

  const entry = { eventId, choiceId, day, title: definition.title, choiceLabel: choice.label, consequence: choice.consequence };
  return {
    storyline: { ...storyline, currentEventId: null, history: [...safeArray(storyline.history), entry] },
    consequence: choice.consequence,
  };
}

export function setCurrentEvent(storyline, eventId) {
  return { ...storyline, currentEventId: eventId };
}

export function historyForDisplay(storyline) {
  return safeArray(storyline?.history);
}
