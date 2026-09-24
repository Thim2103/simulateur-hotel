// Seasons and city events, as the player lives them: four named seasons with
// the guests they bring, and an agenda of the events to come.
//
// The numbers of the calendar itself (a season's demand, an event's effects)
// live in lib/hotelEvents/, which this builds on -- it adds no second calendar,
// and every answer is a pure function of the date, like that one.
//
// FOUR SEASONS (a reading of the year on top of the calendar's tiers):
//   printemps (1 Mar - 20 Jun) and automne (1 Sep - 31 Oct) -- balanced demand
//     and, above all, a strong share of professional guests: half the bookings
//     are business travellers and companies write for seminars half as often
//     again (lib/mice/)
//   été (21 Jun - 31 Aug) -- the high season: strong demand, guests less
//     sensitive to prices
//   hiver (1 Nov - 28 Feb) -- the low season (the year-end holidays apart):
//     demand falls, yield management becomes crucial
//
// EVENTS added to the calendar (see hotelEvents/hotelEventsEngine.js): a grand
// music festival and an international fair (3 days, demand +80 %, guests who
// accept much higher prices) and roadworks in front of the hotel (5 days, the
// guests staying there are 5 points less satisfied).
//
// THE AGENDA (eventCalendar()): what the player gets to see ahead. The city's
// agenda is public, so festivals, fairs and roadworks show up to 30 days
// ahead; a heat or cold wave only in the few days its forecast is reliable;
// a surprise audit never.
import { safeNumber } from "../safe.js";
import { dayIndexOf, eventsBetween, eventsOn, EVENT_TYPES, seasonDemand, seasonOn } from "../hotelEvents/hotelEventsEngine";

const DAY_MS = 86400000;

export const PRO_SHARE = 0.5; // share of the bookings that are professional guests in spring and autumn
export const MICE_REQUEST_FACTOR = 1.5; // companies write half as often again
export const SHORT_HORIZON = 7;
export const LONG_HORIZON = 30;
export const POINTS_PER_STAR = 20; // satisfaction is out of 100, reviews out of 5

export const FOUR_SEASONS = {
  spring: {
    id: "spring",
    label: "Printemps",
    icon: "🌸",
    pro: true,
    description: "Demande équilibrée et forte part de clientèle professionnelle : séminaires et voyageurs d'affaires.",
  },
  summer: {
    id: "summer",
    label: "Été",
    icon: "☀️",
    pro: false,
    description: "Haute saison : forte demande, des clients moins sensibles aux prix. Le ménage et l'entretien sont sous pression.",
  },
  autumn: {
    id: "autumn",
    label: "Automne",
    icon: "🍁",
    pro: true,
    description: "Demande équilibrée et forte part de clientèle professionnelle : salons, séminaires et voyageurs d'affaires.",
  },
  winter: {
    id: "winter",
    label: "Hiver",
    icon: "❄️",
    pro: false,
    description: "Basse saison (hors fêtes de fin d'année) : la demande fléchit, le yield management devient crucial pour remplir les chambres.",
  },
};

function toDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

// The season of the year a date falls in.
export function seasonOfYear(value) {
  const date = toDate(value);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if ((month === 6 && day >= 21) || month === 7 || month === 8) return "summer";
  if (month >= 3 && month <= 6) return "spring";
  if (month === 9 || month === 10) return "autumn";
  return "winter";
}

export const isProSeason = (value) => FOUR_SEASONS[seasonOfYear(value)].pro;

// The share of the day's bookings that are business guests, by the calendar.
export function proShareOn(value) {
  return isProSeason(value) ? PRO_SHARE : 0;
}

// How much more (or as much) companies write for seminars on a date.
export function miceRequestFactor(value) {
  return isProSeason(value) ? MICE_REQUEST_FACTOR : 1;
}

// A season as the interface reads it: its own words, what the calendar's tier
// does to demand and prices, and what to do about it.
export function describeSeason(value, hotelState) {
  const four = FOUR_SEASONS[seasonOfYear(value)];
  const tier = seasonOn(value);
  const demandPercent = Math.round((seasonDemand(value, hotelState) - 1) * 100);
  let advice = "";
  if (tier.tier === "low") advice = "Activez le yield management et vos campagnes marketing pour remplir l'hôtel.";
  else if (tier.tier === "high") advice = "Relevez vos tarifs : vos clients y sont moins sensibles.";
  else if (four.pro) advice = "Soignez l'offre business : séminaires, salles de réunion, chambres pour voyageurs d'affaires.";
  return {
    id: four.id,
    label: four.label,
    icon: four.icon,
    description: four.description,
    pro: four.pro,
    proSharePercent: Math.round(proShareOn(value) * 100),
    tier: tier.tier,
    calendarLabel: tier.label,
    demandPercent,
    priceTolerancePercent: Math.round(safeNumber(tier.priceTolerance, 0) * 100),
    advice,
  };
}

// ---- roadworks ----------------------------------------------------------------------

// Points of satisfaction the guests staying on a night lose (out of 100).
export function satisfactionPenaltyOn(value) {
  return eventsOn(value).reduce((sum, event) => sum + safeNumber(EVENT_TYPES[event.id]?.satisfactionPenalty, 0), 0);
}

// What a stay loses in satisfaction: the worst night of it (the guest does not
// suffer twice from the same noise).
export function satisfactionPenaltyForStay(reservation) {
  const arrival = reservation?.arrival;
  const departure = reservation?.departure;
  if (!arrival || !departure) return 0;
  const from = dayIndexOf(arrival);
  const to = dayIndexOf(departure);
  let worst = 0;
  for (let night = from; night < to && night < from + 30; night += 1) worst = Math.max(worst, satisfactionPenaltyOn(night * DAY_MS));
  return worst;
}

// ---- the agenda ---------------------------------------------------------------------------

const ADVICE = {
  demand: (event) =>
    `Anticipez : relevez vos tarifs (les clients acceptent jusqu'à +${event.priceTolerancePercent} % de plus) et prévoyez vos stocks pour environ +${event.demandPercent} % de clients.`,
  nuisance: (event) => `Prévenez la réception et prévoyez un geste pour les clients gênés : −${event.satisfactionPenalty} points de satisfaction.`,
  climate: () => "Vérifiez votre niveau d'entretien : facture d'énergie et usure en hausse.",
};

// The events the player can see coming, `horizon` days ahead (7 or 30): each
// with what it does and what to do about it, in the order they start.
export function eventCalendar(value, hotelState, horizon = LONG_HORIZON) {
  return eventsBetween(value, Math.min(horizon, LONG_HORIZON))
    .filter((event) => {
      if (event.startsInDays > horizon) return false;
      if (event.kind === "audit") return false;
      if (event.kind === "climate") return event.startsInDays <= EVENT_TYPES[event.id].noticeDays;
      return true;
    })
    .map((event) => {
      const type = EVENT_TYPES[event.id];
      const enriched = {
        ...event,
        ongoing: event.startsInDays <= 0,
        demandPercent: type.demand && type.demand !== 1 ? Math.round((type.demand - 1) * 100) : 0,
        priceTolerancePercent: Math.round(safeNumber(type.priceTolerance, 0) * 100),
        satisfactionPenalty: safeNumber(type.satisfactionPenalty, 0),
        premium: !!type.premiumFirst,
        opportunity: type.kind === "demand",
      };
      return { ...enriched, advice: ADVICE[type.kind] ? ADVICE[type.kind](enriched) : "" };
    });
}

const SeasonEventEngine = { seasonOfYear, proShareOn, miceRequestFactor, describeSeason, satisfactionPenaltyForStay, eventCalendar };
export default SeasonEventEngine;
