// The media & health crisis: a rare, late-game event that shakes the hotel's
// reputation and empties its rooms until the player answers it well.
//
// WHEN. A crisis breaks (no rng: a stable hash of the date) when
//   - a hotel audit came out unfavourable    -> food poisoning at the restaurant,
//   - a V.I.P. left an unanswered bad review -> a scandal article,
//   - three 1-star reviews wait for an answer -> bed bugs or a hot-water failure,
//   - or, rarely, out of the blue (about one day in a hundred, once the hotel is
//     a few days old).
// Never while one is under way, and not within a fortnight of the last.
//
// WHAT IT DOES. At once the reputation is capped 15 to 25 points below where it
// stood, and the cap rises back linearly until the crisis ends, so the drop
// lasts exactly as long as the crisis (5 to 10 days) and shortening the crisis
// shortens the drop. The general demand falls by 30 to 50 % on each day of
// the crisis (a `media` factor in lib/demand/, present only when it is not 1).
//
// WHAT THE PLAYER CAN DO (once):
//   - DENY -- free. 40 % of the time (a stable hash) a counter-expert proves
//     the hotel wrong three days later: the crisis lasts 3 days longer and gets
//     worse.
//   - APOLOGISE (2 000 EUR) -- an official statement: the crisis lasts half as
//     long (what is left of it).
//   - AUDIT (8 000 EUR) -- independent controls: the crisis stops at once and a
//     rehabilitation campaign, "the safest hotel in town", lifts demand for ten
//     days and makes the front page.
// The audits also give the reputation back; the demand model never counts the
// cap twice (see reputationHoldOn()).
// Say nothing for two days and the silence feeds the press: two more days.
//
// State: `hotelState.mediaCrisis` = { crises, nextId, rehab, lastOutcome }. Pure
// and deterministic; a hotel that never had a crisis keeps no such state.
import { safeArray, safeNumber, safeObject } from "../safe.js";
import { dayIndexOf, toIsoDate, auditOn } from "../hotelEvents/hotelEventsEngine";
import { mixedRandom } from "../clients/guestProfiles";
import { listReviews } from "../clients/guestReviewEngine";
import { treasuryOf } from "../finance/investmentFunding";
import { debitCurrentMonth } from "../finance/oneOffCosts";

const DAY_MS = 86400000;

export const MIN_DAY = 7;
export const RANDOM_CHANCE = 0.012;
// Game Balancing V1.0, Lot 4: past this day, a random crisis is more likely --
// a genuine Late Game challenge instead of a rare, easily-ignored event.
export const LATE_GAME_DAY = 40;
export const LATE_GAME_RANDOM_CHANCE = 0.02;
export const COOLDOWN_DAYS = 15;
export const ONE_STAR_TRIGGER = 3;

export const PEAK_MIN = 15;
export const PEAK_SPAN = 11; // 15..25 points
export const DROP_MIN = 0.3;
export const DROP_STEPS = 20; // 30..50 %
export const DURATION_MIN = 5;
export const DURATION_SPAN = 6; // 5..10 days

export const APOLOGY_COST = 2000;
export const AUDIT_COST = 8000;
export const COUNTER_EXPERTISE_CHANCE = 0.4;
export const WORSEN_DELAY = 3;
export const WORSEN_EXTRA_DAYS = 3;
export const WORSEN_EXTRA_PEAK = 8;
export const WORSEN_EXTRA_DROP = 0.1;
export const MAX_DROP = 0.6;
export const SILENCE_DAYS = 2;
export const SILENCE_EXTRA_DAYS = 2;
export const REHAB_DAYS = 10;
export const REHAB_BOOST = 0.15;

export const CRISIS_KINDS = {
  "food-poisoning": {
    id: "food-poisoning",
    icon: "🤢",
    title: "Intoxication alimentaire au restaurant",
    story: "Plusieurs clients du restaurant sont tombés malades après leur repas ; la presse locale s'empare de l'affaire.",
  },
  "vip-scandal": {
    id: "vip-scandal",
    icon: "📰",
    title: "Article scandale d'un V.I.P. insatisfait",
    story: "Un V.I.P. déçu publie un récit acide de son séjour ; l'article est repris partout.",
  },
  bedbugs: {
    id: "bedbugs",
    icon: "🐛",
    title: "Infiltration de punaises de lit",
    story: "Des clients affirment avoir été piqués dans leur chambre ; les photos circulent sur les réseaux.",
  },
  "hot-water": {
    id: "hot-water",
    icon: "🚿",
    title: "Panne générale d'eau chaude",
    story: "Plus d'eau chaude dans tout l'hôtel : les clients furieux racontent leur douche glacée en ligne.",
  },
};

const RANDOM_KINDS = ["food-poisoning", "vip-scandal", "bedbugs", "hot-water"];
const REVIEW_KINDS = ["bedbugs", "hot-water"];

export const CAUSE_TEXT = {
  hygiene: "un contrôle d'hygiène défavorable",
  vip: "l'avis négatif d'un V.I.P. resté sans réponse",
  reviews: "une série d'avis 1★ restés sans réponse",
  random: "une rumeur qui se répand",
};

export const STRATEGIES = {
  deny: {
    id: "deny",
    icon: "🙅",
    label: "Démentir",
    cost: 0,
    description: "Transparence zéro : gratuit, mais si une contre-expertise survient (2 chances sur 5), la crise empire et dure trois jours de plus.",
  },
  apology: {
    id: "apology",
    icon: "📣",
    label: "Communiqué officiel & excuses",
    cost: APOLOGY_COST,
    description: "Divise par deux ce qu'il reste de la crise : la baisse de réputation et de demande dure moitié moins longtemps.",
  },
  audit: {
    id: "audit",
    icon: "🛡️",
    label: "Audits indépendants & réhabilitation",
    cost: AUDIT_COST,
    description: "Stoppe la crise immédiatement et lance la campagne « L'hôtel le plus sûr de la ville » : +15 % d'attractivité pendant dix jours, en une de la presse.",
  },
};

// ---- state ------------------------------------------------------------------------------

function state(hotelState) {
  const source = safeObject(safeObject(hotelState).mediaCrisis);
  return {
    crises: safeArray(source.crises),
    nextId: Math.max(1, safeNumber(source.nextId, 1)),
    rehab: source.rehab || null,
    lastOutcome: source.lastOutcome || null,
  };
}

function write(hotelState, next) {
  return { ...safeObject(hotelState), mediaCrisis: next };
}

const isActive = (crisis) => crisis.status === "active";

export function activeCrisis(hotelState) {
  return state(hotelState).crises.find(isActive) || null;
}

export function crisisHistory(hotelState) {
  return state(hotelState).crises.filter((crisis) => !isActive(crisis));
}

export function rehabilitation(hotelState) {
  return state(hotelState).rehab;
}

export function lastOutcome(hotelState) {
  return state(hotelState).lastOutcome;
}

// ---- the crisis's own numbers ----------------------------------------------------------------

// Points of reputation the crisis holds the hotel down by on a given day:
// the full peak the night it breaks, back to nothing the day after it ends.
export function penaltyOn(crisis, dateOrIndex) {
  const index = typeof dateOrIndex === "number" && dateOrIndex < 1e7 ? dateOrIndex : dayIndexOf(dateOrIndex);
  const onset = dayIndexOf(crisis.onsetDate);
  const end = dayIndexOf(crisis.endDate);
  if (index < onset || index > end) return 0;
  const span = end + 1 - onset;
  return span > 0 ? safeNumber(crisis.peak, 0) * ((end + 1 - index) / span) : 0;
}

export function reputationPenaltyOn(hotelState, date) {
  const crisis = activeCrisis(hotelState);
  return crisis ? Math.round(penaltyOn(crisis, dayIndexOf(date))) : 0;
}

// The points the crisis is holding the STORED reputation down by at the start
// of a day (the cap set the evening before). The demand model adds them back:
// the crisis's effect on demand is its own `media` factor (30 to 50 %), not
// that plus the lower reputation on top.
export function reputationHoldOn(hotelState, date) {
  const crisis = activeCrisis(hotelState);
  return crisis ? penaltyOn(crisis, dayIndexOf(date) - 1) : 0;
}

function demandDays(crisis) {
  return { start: dayIndexOf(crisis.startDate), end: dayIndexOf(crisis.endDate) };
}

// The share of the usual demand the crisis leaves (1 when there is none), times
// the boost of a rehabilitation campaign in progress.
export function mediaDemandFactor(hotelState, date) {
  const index = dayIndexOf(date);
  const source = state(hotelState);
  let factor = 1;
  const crisis = source.crises.find(isActive);
  if (crisis) {
    const { start, end } = demandDays(crisis);
    if (index >= start && index <= end) factor *= 1 - Math.min(MAX_DROP, safeNumber(crisis.demandDrop, 0));
  }
  const rehab = source.rehab;
  if (rehab) {
    const start = dayIndexOf(rehab.startDate);
    const end = dayIndexOf(rehab.endDate);
    if (index >= start && index <= end) factor *= 1 + safeNumber(rehab.boost, 0) * ((end + 1 - index) / (end + 1 - start));
  }
  return factor;
}

// A crisis as the interface reads it.
export function describeCrisis(crisis, date) {
  if (!crisis) return null;
  const kind = CRISIS_KINDS[crisis.kind] || CRISIS_KINDS.bedbugs;
  const index = dayIndexOf(date);
  const { start, end } = demandDays(crisis);
  const from = Math.max(index, start);
  return {
    id: crisis.id,
    kind: crisis.kind,
    icon: kind.icon,
    title: kind.title,
    story: kind.story,
    cause: crisis.cause,
    causeText: CAUSE_TEXT[crisis.cause] || CAUSE_TEXT.random,
    status: crisis.status,
    onsetDate: crisis.onsetDate,
    startDate: crisis.startDate,
    endDate: crisis.endDate,
    daysLeft: Math.max(0, end + 1 - from),
    reputationPenalty: Math.round(penaltyOn(crisis, Math.max(index, dayIndexOf(crisis.onsetDate)))),
    peak: crisis.peak,
    demandDropPercent: Math.round(safeNumber(crisis.demandDrop, 0) * 100),
    decision: crisis.decision || null,
    decided: !!crisis.decision,
    worsened: !!crisis.worsened,
    worsensOn: crisis.worsensOn || null,
    silenceExtended: !!crisis.silenceExtended,
  };
}

export function describeActiveCrisis(hotelState, date) {
  return describeCrisis(activeCrisis(hotelState), date);
}

// The rehabilitation campaign in progress at a date: how many days it has left
// and the attractiveness it still adds, or null.
export function describeRehab(hotelState, date) {
  const rehab = state(hotelState).rehab;
  if (!rehab) return null;
  const index = dayIndexOf(date);
  const start = dayIndexOf(rehab.startDate);
  const end = dayIndexOf(rehab.endDate);
  if (index < start || index > end) return null;
  return { title: "L'hôtel le plus sûr de la ville", daysLeft: end + 1 - index, boostPercent: Math.round(safeNumber(rehab.boost, 0) * ((end + 1 - index) / (end + 1 - start)) * 100), endDate: rehab.endDate };
}

// ---- the player's answer -------------------------------------------------------------------

// What the player can do about the crisis under way, with what each costs.
export function crisisOptions(hotelState, date) {
  const crisis = activeCrisis(hotelState);
  if (!crisis) return [];
  const remaining = describeCrisis(crisis, date).daysLeft;
  return Object.values(STRATEGIES).map((strategy) => {
    let reason = "";
    if (crisis.decision) reason = "Vous avez déjà répondu à cette crise";
    else if (remaining <= 0) reason = "La crise est terminée";
    else if (strategy.cost > 0 && treasuryOf(hotelState) < strategy.cost) reason = "Trésorerie insuffisante";
    return { ...strategy, available: reason === "", reason };
  });
}

function withCrisis(hotelState, crisis) {
  const current = state(hotelState);
  return { ...current, crises: current.crises.map((item) => (item.id === crisis.id ? crisis : item)) };
}

// Answers the crisis under way. A no-op unless there is one, it has not been
// answered yet and (for a paid answer) the treasury can pay for it. `date` is
// the day about to be played.
export function respondToCrisis(hotelBundle, type, { date, day = 0 } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const crisis = activeCrisis(hotelState);
  const option = crisisOptions(hotelState, date).find((item) => item.id === type);
  if (!crisis || !option || !option.available) return bundle;

  const iso = toIsoDate(date);
  const index = dayIndexOf(iso);
  const decision = { type, date: iso, day, cost: option.cost };
  let updated = { ...crisis, decision };
  let rehab = state(hotelState).rehab;
  let pressHighlights = safeArray(hotelState.pressHighlights);
  let outcome;

  if (type === "deny") {
    const counter = mixedRandom(`crisis-counter:${crisis.id}`) < COUNTER_EXPERTISE_CHANCE;
    if (counter) updated.worsensOn = toIsoDate((index + WORSEN_DELAY) * DAY_MS);
    outcome = { type, text: "Vous démentez tout en bloc. La presse attend la suite : une contre-expertise pourrait tout faire basculer." };
  } else if (type === "apology") {
    const remaining = describeCrisis(crisis, iso).daysLeft;
    const kept = Math.ceil(remaining / 2);
    updated.endDate = toIsoDate((Math.max(index, dayIndexOf(crisis.startDate)) + kept - 1) * DAY_MS);
    outcome = { type, text: `Communiqué publié : la crise ne devrait plus durer que ${kept} jour${kept > 1 ? "s" : ""}.` };
  } else {
    updated = { ...updated, status: "resolved", endDate: toIsoDate((index - 1) * DAY_MS), endedOn: iso, resolvedByAudit: true };
    rehab = { startDate: iso, endDate: toIsoDate((index + REHAB_DAYS - 1) * DAY_MS), boost: REHAB_BOOST };
    pressHighlights = [
      ...pressHighlights,
      {
        id: `press:${crisis.id}`,
        day,
        guestName: "Presse locale",
        followers: 0,
        headline: "« L'hôtel le plus sûr de la ville »",
        text: "Des audits indépendants ont passé l'établissement au crible : hygiène, équipements et sécurité sont irréprochables.",
      },
    ];
    outcome = { type, text: "Audits concluants : la crise est terminée et la campagne « L'hôtel le plus sûr de la ville » démarre." };
  }

  let debited = option.cost > 0 ? debitCurrentMonth(hotelState, option.cost) : hotelState;
  // The audits clear the hotel's name: the reputation the crisis was holding
  // down comes back with it.
  if (type === "audit" && Number.isFinite(crisis.baseReputation)) {
    const player = safeObject(safeObject(debited.progression).player);
    if (Number.isFinite(player.reputation) && player.reputation < crisis.baseReputation) {
      debited = { ...debited, progression: { ...safeObject(debited.progression), player: { ...player, reputation: crisis.baseReputation } } };
    }
  }
  const next = { ...withCrisis(hotelState, updated), rehab, lastOutcome: { ...outcome, day } };
  return { ...bundle, hotelState: { ...write(debited, next), pressHighlights } };
}

// ---- the day's news -------------------------------------------------------------------------

// The crisis in the day just played, as lines of the daily review.
export function crisisNewsOn(hotelState, date) {
  const iso = toIsoDate(date);
  const lines = [];
  state(hotelState).crises.forEach((crisis) => {
    const described = describeCrisis(crisis, iso);
    if (crisis.onsetDate === iso) {
      lines.push(
        `Crise médiatique : ${described.title} (${described.causeText}). Votre réputation chute de ${described.peak} points et la demande de ${described.demandDropPercent} % pendant ${described.daysLeft} jours : répondez vite.`
      );
    }
    if (crisis.worsenedOn === iso) lines.push("Une contre-expertise contredit votre démenti : la crise s'aggrave et dure plus longtemps.");
    if (crisis.silencedOn === iso) lines.push("Votre silence alimente la presse : la crise dure deux jours de plus.");
    if (crisis.endedOn === iso && !crisis.resolvedByAudit) lines.push(`La crise « ${described.title} » est terminée : la réputation et la demande remontent.`);
  });
  return lines;
}

// ---- the daily step -------------------------------------------------------------------------------

function trigger(hotelState, iso, day) {
  const used = new Set(state(hotelState).crises.flatMap((crisis) => safeArray(crisis.sourceIds)));
  const audit = auditOn(hotelState, day);
  if (audit && audit.outcome === "warning" && !used.has(`audit:${audit.id}`)) {
    return { kind: "food-poisoning", cause: "hygiene", sourceIds: [`audit:${audit.id}`] };
  }
  const reviews = listReviews(hotelState).filter((review) => !review.response && !used.has(`review:${review.id}`));
  const vip = reviews.find((review) => review.profile === "vip" && review.rating <= 2);
  if (vip) return { kind: "vip-scandal", cause: "vip", sourceIds: [`review:${vip.id}`] };
  const oneStar = reviews.filter((review) => review.rating === 1);
  if (oneStar.length >= ONE_STAR_TRIGGER) {
    const kind = REVIEW_KINDS[Math.floor(mixedRandom(`crisis-kind:${iso}`) * REVIEW_KINDS.length) % REVIEW_KINDS.length];
    return { kind, cause: "reviews", sourceIds: oneStar.map((review) => `review:${review.id}`) };
  }
  const randomChance = day >= LATE_GAME_DAY ? LATE_GAME_RANDOM_CHANCE : RANDOM_CHANCE;
  if (mixedRandom(`media-crisis:${iso}`) < randomChance) {
    const kind = RANDOM_KINDS[Math.floor(mixedRandom(`crisis-kind:${iso}`) * RANDOM_KINDS.length) % RANDOM_KINDS.length];
    return { kind, cause: "random", sourceIds: [] };
  }
  return null;
}

function capReputation(hotelState, crisis, index) {
  const player = safeObject(safeObject(hotelState.progression).player);
  const reputation = player.reputation;
  if (!Number.isFinite(reputation) || !Number.isFinite(crisis.baseReputation)) return hotelState;
  const cap = Math.max(0, Math.round(crisis.baseReputation - penaltyOn(crisis, index)));
  if (reputation <= cap) return hotelState;
  return { ...hotelState, progression: { ...safeObject(hotelState.progression), player: { ...player, reputation: cap } } };
}

// Called once a day, after the day is played (see careerEngine.runCareerDay):
// keeps the reputation under the crisis's cap, applies a counter-expertise or
// the price of silence, closes a crisis that has run its course, and lets a new
// one break.
export function advanceMediaCrisis(hotelState, { date, day = 0 } = {}) {
  const iso = toIsoDate(date ?? new Date());
  const index = dayIndexOf(iso);
  let current = safeObject(hotelState);
  const source = state(current);
  let crises = source.crises;

  const running = crises.find(isActive);
  if (running) {
    let crisis = { ...running };
    if (crisis.worsensOn && !crisis.worsened && index >= dayIndexOf(crisis.worsensOn)) {
      crisis = {
        ...crisis,
        worsened: true,
        worsenedOn: iso,
        peak: safeNumber(crisis.peak, 0) + WORSEN_EXTRA_PEAK,
        demandDrop: Math.min(MAX_DROP, safeNumber(crisis.demandDrop, 0) + WORSEN_EXTRA_DROP),
        endDate: toIsoDate((dayIndexOf(crisis.endDate) + WORSEN_EXTRA_DAYS) * DAY_MS),
      };
    }
    if (!crisis.decision && !crisis.silenceExtended && index >= dayIndexOf(crisis.onsetDate) + SILENCE_DAYS) {
      crisis = { ...crisis, silenceExtended: true, silencedOn: iso, endDate: toIsoDate((dayIndexOf(crisis.endDate) + SILENCE_EXTRA_DAYS) * DAY_MS) };
    }
    current = capReputation(current, crisis, index);
    if (index >= dayIndexOf(crisis.endDate)) crisis = { ...crisis, status: "ended", endedOn: iso };
    crises = crises.map((item) => (item.id === crisis.id ? crisis : item));
    return write(current, { ...source, crises });
  }

  if (day < MIN_DAY) return hotelState;
  const lastEnd = crises.map((crisis) => (crisis.endedOn ? dayIndexOf(crisis.endedOn) : -Infinity)).reduce((max, value) => Math.max(max, value), -Infinity);
  if (index - lastEnd < COOLDOWN_DAYS) return hotelState;

  const cause = trigger(current, iso, day);
  if (!cause) return hotelState;
  const key = `${iso}:${cause.kind}`;
  const player = safeObject(safeObject(current.progression).player);
  const duration = DURATION_MIN + (Math.floor(mixedRandom(`crisis-duration:${key}`) * DURATION_SPAN) % DURATION_SPAN);
  const crisis = {
    id: `crisis:${source.nextId}`,
    kind: cause.kind,
    cause: cause.cause,
    sourceIds: cause.sourceIds,
    status: "active",
    onsetDate: iso,
    startDate: toIsoDate((index + 1) * DAY_MS),
    endDate: toIsoDate((index + duration) * DAY_MS),
    peak: PEAK_MIN + (Math.floor(mixedRandom(`crisis-peak:${key}`) * PEAK_SPAN) % PEAK_SPAN),
    demandDrop: DROP_MIN + Math.round(mixedRandom(`crisis-drop:${key}`) * DROP_STEPS) / 100,
    baseReputation: Number.isFinite(player.reputation) ? player.reputation : null,
    decision: null,
    day,
  };
  current = capReputation(current, crisis, index);
  return write(current, { ...source, crises: [...crises, crisis].slice(-10), nextId: source.nextId + 1 });
}

const MediaCrisisEngine = { reputationHoldOn, describeRehab, advanceMediaCrisis, respondToCrisis, crisisOptions, mediaDemandFactor, describeCrisis, describeActiveCrisis, crisisNewsOn };
export default MediaCrisisEngine;
