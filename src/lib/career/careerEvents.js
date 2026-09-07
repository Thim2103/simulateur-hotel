// Catalog of narrative story events and their eligibility: which ones can
// trigger, given how many days the player has been on the job and their
// current level. See careerStoryline.js for resolving a player's *choice*
// on one of these events into actual consequences.
import { safeArray, safeNumber } from "../safe";

export const STORY_EVENT_CATALOG = [
  {
    id: "first-week-review",
    title: "Bilan de la première semaine",
    text: "Votre direction générale demande un point d'étape après 7 jours à la tête de l'établissement.",
    minDay: 7,
    minLevel: 1,
    choices: [
      { id: "reassure", label: "Rassurer la direction sur la stratégie en cours", consequence: { reputationDelta: 3 } },
      { id: "ask-budget", label: "Demander un budget supplémentaire", consequence: { cashDelta: 2000, reputationDelta: -2 } },
    ],
  },
  {
    id: "staff-conflict",
    title: "Tension en cuisine",
    text: "Un conflit éclate entre le chef et un membre de l'équipe de salle.",
    minDay: 3,
    minLevel: 1,
    choices: [
      { id: "mediate", label: "Organiser une médiation", consequence: { skillId: "leadership", skillPoints: 2 } },
      { id: "ignore", label: "Laisser l'équipe régler ça seule", consequence: { reputationDelta: -3 } },
    ],
  },
  {
    id: "expansion-offer",
    title: "Une opportunité d'expansion",
    text: "Un investisseur propose de financer l'ouverture d'un second établissement.",
    minDay: 14,
    minLevel: 3,
    choices: [
      { id: "accept", label: "Accepter l'offre", consequence: { skillId: "negotiation", skillPoints: 3, cashDelta: -1000 } },
      { id: "decline", label: "Décliner pour consolider l'existant", consequence: { reputationDelta: 2 } },
    ],
  },
];

export function isEventEligible(definition, { day, level, triggeredEventIds }) {
  if (safeArray(triggeredEventIds).includes(definition.id)) return false;
  if (safeNumber(day, 0) < safeNumber(definition.minDay, 0)) return false;
  if (safeNumber(level, 1) < safeNumber(definition.minLevel, 1)) return false;
  return true;
}

// The next event the player hasn't already seen and is eligible for
// today, if any -- storyline advances one event at a time.
export function findNextEligibleEvent({ day, level, triggeredEventIds }, catalog = STORY_EVENT_CATALOG) {
  return safeArray(catalog).find((definition) => isEventEligible(definition, { day, level, triggeredEventIds })) || null;
}

export function findEventDefinition(eventId, catalog = STORY_EVENT_CATALOG) {
  return safeArray(catalog).find((definition) => definition.id === eventId) || null;
}
