// The hotel's CALENDAR: named seasons and scheduled events that give the days
// their rhythm. Everything is a pure function of the calendar date, so the
// same date always brings the same season and the same events -- no rng, no
// state to keep in sync (lib/events/'s ambient random events, weather and
// VIPs, keep working alongside; their tests pin a fixed rng sequence, which
// is why this layer is calendar-driven instead of drawing new random
// numbers).
//
// SEASONS (by date):
//   haute saison -- summer (21 Jun - 31 Aug) and the year-end holidays
//     (20 Dec - 3 Jan): demand +40 %, guests accept prices up to 20 % above
//     what the hotel's standing justifies, but housekeeping and upkeep are
//     under pressure (more cleaning per room, faster wear)
//   basse saison -- November and 4 Jan - 14 Feb: demand -30 %; the player has
//     to cut prices or push marketing (a budget above 3 000 EUR/month wins
//     back up to 10 points)
//   moyenne saison -- the rest of the year, neutral
//
// EVENTS: each type recurs in fixed-length windows, once per window, on a day
// picked by a hash of (type, window), restricted to the months that make
// sense. All but the surprise audit are ANNOUNCED a few days ahead:
//   festival local / salon professionnel -- 3 days of exceptional demand,
//     favouring the high-end rooms (deluxe, suites)
//   grand festival de musique / salon international -- rarer, bigger: 3 days of
//     demand +80 %, guests who accept much higher prices (lib/seasonEvents/)
//   travaux de voirie -- 5 days of noise and waiting at the door: the guests
//     staying there are 5 points less satisfied (a "nuisance" event)
//   canicule / vague de froid -- 4 days of extra energy cost and wear; a
//     hotel on the Économique upkeep level risks wear breakdowns (domotics
//     halve the risk and the bill)
//   inspection / audit hôtelier -- a surprise one-day evaluation: a quality
//     label (reputation +3 for 60 days) for a hotel in great shape, a
//     warning (reputation -4 for 15 days) for a run-down one
//
// The played day's situation is snapshotted by advanceHotelEvents() at
// `hotelState.hotelEvents.today` (housekeeping and wear read it), along with
// the audit results (`hotelEvents.audits`).
import { safeArray, safeNumber, safeObject } from "../safe.js";
import { pseudoRandom } from "../staff/staffEventsEngine";
import { maintenanceLevel, hotelCondition } from "../maintenance/maintenanceCostEngine";
import { openIncidents } from "../maintenance/incidentImpact";

const DAY_MS = 86400000;
export const MAX_PRICE_TOLERANCE = 0.3;
export const LOW_SEASON_RELIEF_FROM = 3000; // EUR/month of marketing budget
export const LOW_SEASON_RELIEF_PER_1000 = 0.01;
export const LOW_SEASON_MAX_RELIEF = 0.1;

// ---- seasons ---------------------------------------------------------------

export const SEASON_TIERS = {
  high: { demand: 1.4, priceTolerance: 0.2, housekeepingPressure: 1.15, wearPressure: 0.3 },
  low: { demand: 0.7, priceTolerance: 0, housekeepingPressure: 1, wearPressure: 0 },
  shoulder: { demand: 1, priceTolerance: 0, housekeepingPressure: 1, wearPressure: 0 },
};

export const SEASONS = {
  summer: { id: "summer", label: "Haute saison — été", icon: "☀️", tier: "high" },
  holidays: { id: "holidays", label: "Haute saison — fêtes de fin d'année", icon: "🎄", tier: "high" },
  low: { id: "low", label: "Basse saison", icon: "🍂", tier: "low" },
  shoulder: { id: "shoulder", label: "Moyenne saison", icon: "🌤️", tier: "shoulder" },
};

function toDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function toIsoDate(value) {
  return toDate(value).toISOString().slice(0, 10);
}

// Whole days since the epoch, UTC: what "which day is it" means here.
export function dayIndexOf(value) {
  const date = toDate(value);
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS);
}

function monthOfIndex(index) {
  return new Date(index * DAY_MS).getUTCMonth();
}

export function seasonIdOn(value) {
  const date = toDate(value);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if ((month === 12 && day >= 20) || (month === 1 && day <= 3)) return "holidays";
  if ((month === 6 && day >= 21) || month === 7 || month === 8) return "summer";
  if (month === 11 || (month === 1 && day >= 4) || (month === 2 && day <= 14)) return "low";
  return "shoulder";
}

export function seasonOn(value) {
  const season = SEASONS[seasonIdOn(value)];
  return { ...season, ...SEASON_TIERS[season.tier] };
}

// In low season, marketing wins back part of the lost demand.
export function lowSeasonRelief(hotelState) {
  const budget = safeNumber(safeObject(safeObject(hotelState).marketing).budget, 0);
  return Math.min(LOW_SEASON_MAX_RELIEF, Math.max(0, ((budget - LOW_SEASON_RELIEF_FROM) / 1000) * LOW_SEASON_RELIEF_PER_1000));
}

// The season's demand multiplier for a date (before the weekday effect).
export function seasonDemand(value, hotelState) {
  const season = seasonOn(value);
  return season.tier === "low" ? season.demand + lowSeasonRelief(hotelState) : season.demand;
}

// ---- scheduled events --------------------------------------------------------

export const EVENT_TYPES = {
  festival: {
    id: "festival",
    name: "Festival local",
    icon: "🎪",
    kind: "demand",
    windowDays: 30,
    durationDays: 3,
    noticeDays: 3,
    months: [3, 4, 5, 6, 7, 8, 9],
    demand: 1.3,
    premiumFirst: true,
    priceTolerance: 0.05,
    housekeepingPressure: 1.1,
    description: "Un festival attire une clientèle exceptionnelle, surtout sur les chambres haut de gamme.",
  },
  "trade-fair": {
    id: "trade-fair",
    name: "Salon professionnel",
    icon: "💼",
    kind: "demand",
    windowDays: 45,
    durationDays: 3,
    noticeDays: 4,
    months: [2, 3, 4, 5, 8, 9, 10],
    demand: 1.2,
    premiumFirst: true,
    priceTolerance: 0.1,
    housekeepingPressure: 1.05,
    description: "Un salon amène des professionnels prêts à payer pour de belles chambres.",
  },
  "music-festival": {
    id: "music-festival",
    name: "Grand Festival de Musique",
    icon: "🎶",
    kind: "demand",
    windowDays: 75,
    durationDays: 3,
    noticeDays: 7,
    months: [5, 6, 7],
    demand: 1.8,
    premiumFirst: true,
    priceTolerance: 0.25,
    housekeepingPressure: 1.2,
    description: "Des milliers de festivaliers envahissent la ville : la demande explose et les clients acceptent de payer bien plus cher.",
  },
  "international-fair": {
    id: "international-fair",
    name: "Salon International",
    icon: "🌐",
    kind: "demand",
    windowDays: 90,
    durationDays: 3,
    noticeDays: 7,
    months: [2, 3, 4, 8, 9, 10],
    demand: 1.8,
    premiumFirst: true,
    priceTolerance: 0.2,
    housekeepingPressure: 1.1,
    description: "Un salon international remplit toute la ville d'exposants et de visiteurs prêts à payer pour être bien logés.",
  },
  roadworks: {
    id: "roadworks",
    name: "Travaux de voirie",
    icon: "🚧",
    kind: "nuisance",
    windowDays: 45,
    durationDays: 5,
    noticeDays: 3,
    months: [2, 3, 4, 5, 8, 9, 10],
    demand: 1,
    satisfactionPenalty: 5,
    description: "Des travaux devant l'hôtel : bruit et attente à l'arrivée gênent les clients hébergés.",
  },
  heatwave: {
    id: "heatwave",
    name: "Canicule",
    icon: "🔥",
    kind: "climate",
    climate: "heat",
    windowDays: 40,
    durationDays: 4,
    noticeDays: 2,
    months: [5, 6, 7],
    demand: 0.95,
    energyExtra: 90,
    wearPressure: 1,
    description: "La climatisation tourne à plein régime : facture d'énergie et usure en hausse.",
  },
  coldwave: {
    id: "coldwave",
    name: "Vague de froid",
    icon: "❄️",
    kind: "climate",
    climate: "cold",
    windowDays: 40,
    durationDays: 4,
    noticeDays: 2,
    months: [11, 0, 1],
    demand: 0.95,
    energyExtra: 90,
    wearPressure: 1,
    description: "Le chauffage tourne à plein régime : facture d'énergie et usure en hausse.",
  },
  "hygiene-audit": {
    id: "hygiene-audit",
    name: "Audit hôtelier",
    icon: "🧾",
    kind: "audit",
    windowDays: 60,
    durationDays: 1,
    noticeDays: 0,
    months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    description: "Inspection surprise : un label de qualité si l'hôtel est impeccable, un avertissement s'il est négligé.",
  },
};

// Extra wear breakdown chance during a heat/cold wave, by upkeep level.
export const CLIMATE_WEAR_CHANCE = { economy: 0.15, standard: 0.03, premium: 0 };
const DOMOTICS = "rooms-domotics";

// The occurrence of `type` in window `windowIndex`, or null when its start
// falls in a month the event doesn't happen in.
function occurrenceInWindow(type, windowIndex) {
  const slack = type.windowDays - type.durationDays + 1;
  const startIndex = windowIndex * type.windowDays + Math.floor(pseudoRandom(`${type.id}:${windowIndex}`) * slack);
  if (!type.months.includes(monthOfIndex(startIndex))) return null;
  return { type: type.id, startIndex, endIndex: startIndex + type.durationDays - 1 };
}

// Every occurrence that overlaps the days [fromIndex, toIndex].
function occurrencesBetween(fromIndex, toIndex) {
  const found = [];
  Object.values(EVENT_TYPES).forEach((type) => {
    for (let window = Math.floor(fromIndex / type.windowDays) - 1; window <= Math.floor(toIndex / type.windowDays) + 1; window += 1) {
      const occurrence = occurrenceInWindow(type, window);
      if (occurrence && occurrence.endIndex >= fromIndex && occurrence.startIndex <= toIndex) found.push(occurrence);
    }
  });
  return found;
}

function describeOccurrence(occurrence, todayIndex) {
  const type = EVENT_TYPES[occurrence.type];
  return {
    id: type.id,
    name: type.name,
    icon: type.icon,
    kind: type.kind,
    description: type.description,
    totalDays: type.durationDays,
    startDate: toIsoDate(occurrence.startIndex * DAY_MS),
    endDate: toIsoDate(occurrence.endIndex * DAY_MS),
    dayNumber: todayIndex - occurrence.startIndex + 1,
    daysLeft: occurrence.endIndex - todayIndex,
    startsInDays: occurrence.startIndex - todayIndex,
    endsToday: occurrence.endIndex === todayIndex,
    effects: describeEventEffects(type),
  };
}

// Events in progress on a date (including the day they start and end).
export function eventsOn(value) {
  const index = dayIndexOf(value);
  return occurrencesBetween(index, index)
    .filter((occurrence) => occurrence.startIndex <= index && occurrence.endIndex >= index)
    .map((occurrence) => describeOccurrence(occurrence, index))
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
}

// Every event that is in progress or starts within `days` days after a date, in
// the order it starts: the calendar as the city's agenda shows it, announcement
// or not (lib/seasonEvents/ decides what the player gets to see).
export function eventsBetween(value, days) {
  const index = dayIndexOf(value);
  return occurrencesBetween(index, index + Math.max(0, days))
    .map((occurrence) => describeOccurrence(occurrence, index))
    .sort((a, b) => a.startsInDays - b.startsInDays || a.id.localeCompare(b.id));
}

// Announced events that start within `horizon` days after a date (never the
// surprise audit).
export function upcomingEvents(value, horizon) {
  const index = dayIndexOf(value);
  return occurrencesBetween(index + 1, index + 30)
    .filter((occurrence) => {
      const type = EVENT_TYPES[occurrence.type];
      const ahead = occurrence.startIndex - index;
      return type.noticeDays > 0 && ahead >= 1 && ahead <= Math.min(type.noticeDays, horizon ?? type.noticeDays);
    })
    .map((occurrence) => describeOccurrence(occurrence, index))
    .sort((a, b) => a.startsInDays - b.startsInDays || a.id.localeCompare(b.id));
}

// Events that ended the day before a date -- for the "it's over" notice.
export function eventsEndedBefore(value) {
  const index = dayIndexOf(value);
  return occurrencesBetween(index - 1, index - 1)
    .filter((occurrence) => occurrence.endIndex === index - 1)
    .map((occurrence) => describeOccurrence(occurrence, index - 1))
    .sort((a, b) => a.id.localeCompare(b.id));
}

// ---- effects -------------------------------------------------------------------

function hasDomotics(hotelState) {
  return !!safeObject(safeObject(safeObject(hotelState).zoneUpgrades).installed)[DOMOTICS];
}

// Everything the calendar does to a date: season plus the events in
// progress, combined.
export function calendarEffects(value, hotelState) {
  const season = seasonOn(value);
  const events = eventsOn(value);
  const types = events.map((event) => EVENT_TYPES[event.id]);
  const climate = types.find((type) => type.climate)?.climate || null;
  const energy = types.reduce((sum, type) => sum + safeNumber(type.energyExtra, 0), 0);

  return {
    season,
    events,
    climate,
    eventsDemandFactor: types.reduce((product, type) => product * safeNumber(type.demand, 1), 1),
    priceTolerance: Math.min(MAX_PRICE_TOLERANCE, season.priceTolerance + types.reduce((sum, type) => sum + safeNumber(type.priceTolerance, 0), 0)),
    premiumFirst: types.some((type) => type.premiumFirst),
    housekeepingPressure: types.reduce((product, type) => product * safeNumber(type.housekeepingPressure, 1), season.housekeepingPressure),
    wearPressure: season.wearPressure + types.reduce((sum, type) => sum + safeNumber(type.wearPressure, 0), 0),
    // Points of satisfaction the guests staying tonight lose (roadworks).
    satisfactionPenalty: types.reduce((sum, type) => sum + safeNumber(type.satisfactionPenalty, 0), 0),
    energyExtra: hasDomotics(hotelState) ? Math.round(energy / 2) : energy,
  };
}

const pct = (factor) => `${factor >= 1 ? "+" : "−"}${Math.abs(Math.round((factor - 1) * 100))} %`;

// The event's effects in the player's words.
export function describeEventEffects(type) {
  const lines = [];
  if (type.demand && type.demand !== 1) lines.push(`Demande ${pct(type.demand)}`);
  if (type.premiumFirst) lines.push("Clientèle haut de gamme : suites et deluxe réservées en priorité");
  if (type.priceTolerance) lines.push(`Clients plus tolérants sur les prix (+${Math.round(type.priceTolerance * 100)} %)`);
  if (type.housekeepingPressure && type.housekeepingPressure > 1) lines.push(`Ménage sous pression (${pct(type.housekeepingPressure)} de travail)`);
  if (type.satisfactionPenalty) lines.push(`Satisfaction des clients hébergés −${type.satisfactionPenalty} points (bruit et attente)`);
  if (type.energyExtra) lines.push(`Énergie : +${type.energyExtra} €/jour`);
  if (type.wearPressure) lines.push("Usure accélérée du bâtiment (risque de pannes en entretien Économique)");
  if (type.kind === "audit") lines.push("Label de qualité ou avertissement selon l'état de l'hôtel");
  return lines;
}

export function describeSeasonEffects(season) {
  const lines = [season.demand === 1 ? "Demande normale" : `Demande ${pct(season.demand)}`];
  if (season.priceTolerance) lines.push(`Clients plus tolérants sur les prix (+${Math.round(season.priceTolerance * 100)} %)`);
  if (season.housekeepingPressure > 1) lines.push(`Ménage sous pression (${pct(season.housekeepingPressure)} de travail)`);
  if (season.wearPressure) lines.push("Usure du bâtiment accélérée");
  if (season.tier === "low") lines.push("Baissez vos prix ou investissez en marketing pour remplir l'hôtel");
  return lines;
}

// ---- the audit ---------------------------------------------------------------

export const AUDIT_LABEL_SCORE = 85;
export const AUDIT_WARNING_SCORE = 55;
export const AUDIT_LABEL_REPUTATION = 3;
export const AUDIT_LABEL_DAYS = 60;
export const AUDIT_WARNING_REPUTATION = -4;
export const AUDIT_WARNING_DAYS = 15;
const AUDIT_LEVEL_BONUS = { economy: -10, standard: 0, premium: 10 };
const AUDIT_INCIDENT_PENALTY = 5;
const AUDIT_MAX_INCIDENT_PENALTY = 15;

// What an auditor would find: the hotel's condition, adjusted by the upkeep
// level and by any breakdown left unrepaired.
export function evaluateAudit(hotelState) {
  const open = openIncidents(hotelState).length;
  const score = Math.round(
    Math.max(0, Math.min(100, hotelCondition(hotelState) + AUDIT_LEVEL_BONUS[maintenanceLevel(hotelState)] - Math.min(AUDIT_MAX_INCIDENT_PENALTY, open * AUDIT_INCIDENT_PENALTY)))
  );
  if (score >= AUDIT_LABEL_SCORE) {
    return { score, outcome: "label", reputation: AUDIT_LABEL_REPUTATION, duration: AUDIT_LABEL_DAYS, message: `Audit hôtelier réussi (${score}/100) : votre établissement obtient le Label Qualité.` };
  }
  if (score < AUDIT_WARNING_SCORE) {
    return { score, outcome: "warning", reputation: AUDIT_WARNING_REPUTATION, duration: AUDIT_WARNING_DAYS, message: `Audit hôtelier défavorable (${score}/100) : avertissement de l'inspecteur, votre réputation en pâtit.` };
  }
  return { score, outcome: "ok", reputation: 0, duration: 0, message: `Audit hôtelier : établissement conforme (${score}/100), sans label ni sanction.` };
}

// ---- state ---------------------------------------------------------------------

function state(hotelState) {
  const source = safeObject(safeObject(hotelState).hotelEvents);
  return { today: source.today || null, audits: safeArray(source.audits) };
}

// The snapshot of the last played day (null before any).
export function todaySnapshot(hotelState) {
  return state(hotelState).today;
}

export function housekeepingPressureOf(hotelState) {
  return safeNumber(todaySnapshot(hotelState)?.housekeepingPressure, 1);
}

export function auditOn(hotelState, day) {
  return state(hotelState).audits.find((audit) => audit.day === day) || null;
}

// Reputation points from audit results still in force (a label, or a warning).
export function auditReputationBonus(hotelState) {
  const { today, audits } = state(hotelState);
  const day = safeNumber(today?.day, 0);
  return audits.filter((audit) => audit.reputation && day <= audit.untilDay).reduce((sum, audit) => sum + audit.reputation, 0);
}

// Records the played day's situation and, on an audit day, its result. Called
// once per played day by careerEngine.runCareerDay(), BEFORE the day's upkeep
// is recorded (which reads the wear pressure).
export function advanceHotelEvents(hotelState, date, day) {
  const current = state(hotelState);
  const effects = calendarEffects(date, hotelState);
  const level = maintenanceLevel(hotelState);
  const climateChance = effects.climate ? (CLIMATE_WEAR_CHANCE[level] ?? 0) * (hasDomotics(hotelState) ? 0.5 : 1) : 0;

  let audits = current.audits;
  const audited = effects.events.some((event) => event.kind === "audit");
  if (audited && !audits.some((audit) => audit.day === day)) {
    const result = evaluateAudit(hotelState);
    audits = [...audits, { id: `audit:${toIsoDate(date)}`, day, date: toIsoDate(date), score: result.score, outcome: result.outcome, reputation: result.reputation, untilDay: day + result.duration, message: result.message }].slice(-10);
  }

  return {
    ...safeObject(hotelState),
    hotelEvents: {
      today: {
        date: toIsoDate(date),
        day,
        season: effects.season.id,
        events: effects.events.map((event) => event.id),
        housekeepingPressure: effects.housekeepingPressure,
        wearPressure: effects.wearPressure,
        wearChanceBonus: climateChance,
      },
      audits,
    },
  };
}

// ---- for the player -------------------------------------------------------------

// The calendar as the UI shows it for a date: the season, what is going on,
// what is coming, what just ended.
export function describeCalendar(value, hotelState) {
  const season = seasonOn(value);
  const effects = calendarEffects(value, hotelState);
  return {
    date: toIsoDate(value),
    season: {
      id: season.id,
      label: season.label,
      icon: season.icon,
      tier: season.tier,
      demandPercent: Math.round((seasonDemand(value, hotelState) - 1) * 100),
      effects: describeSeasonEffects({ ...season, demand: seasonDemand(value, hotelState) }),
    },
    ongoing: effects.events,
    upcoming: upcomingEvents(value),
    ended: eventsEndedBefore(value),
  };
}
