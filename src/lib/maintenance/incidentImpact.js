// What an unrepaired incident (see incidentEngine.js) costs the hotel's
// image: guest-facing reviews, the clients satisfaction index, and the
// stored reputation. Everything here is pure and DETERMINISTIC -- no
// `rng` -- on purpose: lib/events/ and lib/dailyCycle/'s tests pin exact
// outputs to a fixed `rng`, so a new random draw here would shift that
// sequence and break them.
//
// Scope note: this codebase has no per-guest stay model, no checkout
// satisfaction hook, and no booking-generation step that reads reputation
// (see lib/dailyCycle/*: revenue depends only on already-existing
// reservations). So the impact lands where a real, consumed signal
// exists: one review per open incident per day (what guests in-house would
// post), a hotel-wide satisfaction penalty (clientsSatisfaction.js), and a
// daily reputation malus (progression/reputation.js -- which feeds
// marketing reputation and client segments downstream).
import { safeArray, safeObject } from "../safe";

// Reputation only starts to suffer once an incident has stayed open this
// many full days (incidentEngine.advanceIncidentRepairs() increments
// `daysOpen`): a same-day/next-day fix costs nothing, an emergency repair
// (resolved on the spot) never even reaches a review or a penalty.
export const GRACE_DAYS = 1;

// Reputation points lost PER DAY an incident stays open past the grace period.
export const REPUTATION_PENALTY_PER_DAY = { minor: 1, moderate: 2, critical: 4 };

// Guest satisfaction points (0-100 scale) lost while an incident is open.
export const SATISFACTION_PENALTY = { minor: 3, moderate: 6, critical: 12 };
export const MAX_SATISFACTION_PENALTY = 30;

// A repair already underway (a technician is on it) softens both
// penalties -- guests see it being dealt with.
export const REPAIRING_ATTENUATION = 0.5;

const MAX_STORED_REVIEWS = 30;

export function openIncidents(hotelState) {
  return safeArray(safeObject(hotelState).activeIncidents).filter((incident) => incident.status === "active" || incident.status === "repairing");
}

function attenuation(incident) {
  return incident.status === "repairing" ? REPAIRING_ATTENUATION : 1;
}

export function incidentReputationPenalty(hotelState) {
  return openIncidents(hotelState)
    .filter((incident) => (incident.daysOpen || 0) >= GRACE_DAYS)
    .reduce((sum, incident) => sum + (REPUTATION_PENALTY_PER_DAY[incident.severity] || 0) * attenuation(incident), 0);
}

export function incidentSatisfactionPenalty(hotelState) {
  const total = openIncidents(hotelState).reduce((sum, incident) => sum + (SATISFACTION_PENALTY[incident.severity] || 0) * attenuation(incident), 0);
  return Math.min(MAX_SATISFACTION_PENALTY, total);
}

// Review wording per zone. Only "laundry" is ever attributed an incident
// today (see incidentEngine.js's own diagnosticZone()); the rest are ready
// for the day zones are attributed per diagnostic.
const REVIEW_TEXTS = {
  laundry: {
    open: ["Machine à laver HS, pas de serviettes propres.", "Buanderie hors service : draps et serviettes pas changés, inadmissible."],
    repairing: ["Buanderie en panne mais un technicien est venu, à suivre."],
  },
  room: {
    open: ["Climatisation en panne toute la nuit, scandaleux !", "Pas d'eau chaude au réveil, très décevant."],
    repairing: ["Problème dans la chambre, l'équipe s'en occupe."],
  },
  restaurant: {
    open: ["Restaurant en partie fermé pour cause de panne, service dégradé."],
    repairing: ["Panne au restaurant, réparation en cours."],
  },
  kitchen: {
    open: ["Panne en cuisine : plats froids et longue attente."],
    repairing: ["Panne en cuisine en cours de réparation."],
  },
  bar: {
    open: ["Bar hors service pendant notre séjour."],
    repairing: ["Bar en panne, réparation en cours."],
  },
  default: {
    open: ["Une panne technique a gâché une partie de notre séjour."],
    repairing: ["Une panne est en cours de réparation, l'équipe est réactive."],
  },
};

const BASE_RATING = { minor: 3, moderate: 2, critical: 1 };

function hashString(value) {
  return String(value)
    .split("")
    .reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 100003, 7);
}

function reviewRating(incident) {
  let rating = BASE_RATING[incident.severity] ?? 2;
  if ((incident.daysOpen || 0) >= 2) rating -= 1;
  if (incident.status === "repairing") rating += 1;
  return Math.min(5, Math.max(1, rating));
}

// One review per still-open incident for `day`, worded from the incident's
// own zone; rating from its severity, how long it has dragged on, and
// whether a repair is underway.
export function generateIncidentReviews(hotelState, day) {
  return openIncidents(hotelState).map((incident) => {
    const texts = REVIEW_TEXTS[incident.zone] || REVIEW_TEXTS.default;
    const pool = incident.status === "repairing" ? texts.repairing : texts.open;
    return {
      id: `review:${incident.id}:${day}`,
      incidentId: incident.id,
      zone: incident.zone,
      severity: incident.severity,
      day,
      rating: reviewRating(incident),
      text: pool[hashString(`${incident.id}:${day}`) % pool.length],
    };
  });
}

// Appends today's incident reviews to `hotelState.incidentReviews`
// (newest last, capped) -- idempotent per (incident, day), so re-running
// it for the same day never duplicates a review.
export function appendIncidentReviews(hotelState, day) {
  const state = safeObject(hotelState);
  const existing = safeArray(state.incidentReviews);
  const existingIds = new Set(existing.map((review) => review.id));
  const fresh = generateIncidentReviews(state, day).filter((review) => !existingIds.has(review.id));
  return { ...state, incidentReviews: [...existing, ...fresh].slice(-MAX_STORED_REVIEWS) };
}

const IncidentImpact = {
  openIncidents,
  incidentReputationPenalty,
  incidentSatisfactionPenalty,
  generateIncidentReviews,
  appendIncidentReviews,
};
export default IncidentImpact;

// The Clients -> Avis page's review history: every stored incident review,
// newest first, each tagged with the CURRENT status of the incident it
// complains about (a review outlives its incident -- once repaired, it
// stays in the history as "resolved"). `incidentStatus` is "unknown" if
// the incident record itself is gone.
export function buildIncidentReviewHistory(hotelState) {
  const state = safeObject(hotelState);
  const statusById = new Map(safeArray(state.activeIncidents).map((incident) => [incident.id, incident.status]));
  return safeArray(state.incidentReviews)
    .map((review) => ({ ...review, incidentStatus: statusById.get(review.incidentId) || "unknown" }))
    .sort((a, b) => b.day - a.day);
}
