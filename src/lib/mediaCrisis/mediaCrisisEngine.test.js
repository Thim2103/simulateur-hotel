import {
  advanceMediaCrisis,
  respondToCrisis,
  crisisOptions,
  mediaDemandFactor,
  describeCrisis,
  describeActiveCrisis,
  crisisNewsOn,
  activeCrisis,
  crisisHistory,
  rehabilitation,
  penaltyOn,
  reputationPenaltyOn,
  reputationHoldOn,
  MIN_DAY,
  RANDOM_CHANCE,
  COOLDOWN_DAYS,
  PEAK_MIN,
  PEAK_SPAN,
  DROP_MIN,
  DURATION_MIN,
  DURATION_SPAN,
  APOLOGY_COST,
  AUDIT_COST,
  MAX_DROP,
  REHAB_BOOST,
  REHAB_DAYS,
  COUNTER_EXPERTISE_CHANCE,
  WORSEN_EXTRA_DAYS,
  WORSEN_EXTRA_PEAK,
  WORSEN_EXTRA_DROP,
  SILENCE_EXTRA_DAYS,
} from "./mediaCrisisEngine";
import { dayIndexOf, toIsoDate } from "../hotelEvents/hotelEventsEngine";
import { mixedRandom } from "../clients/guestProfiles";

const DAY = 86400000;
const plus = (iso, days) => toIsoDate((dayIndexOf(iso) + days) * DAY);
const ONSET = "2026-09-24";
const DAY_NUMBER = 10;

const hotel = (extra = {}) => ({ finance: { revenue: [50000], costs: [0] }, progression: { player: { reputation: 70 } }, ...extra });
const withAudit = (outcome = "warning", date = ONSET, day = DAY_NUMBER, extra = {}) =>
  hotel({ hotelEvents: { today: null, audits: [{ id: `audit:${date}`, day, date, score: 40, outcome, reputation: -4, untilDay: day + 15 }] }, ...extra });
const review = (id, rating, extra = {}) => ({ id: `stay:${id}`, source: "stay", day: 5, rating, profile: "family", weight: 1, impact: -1, applied: 0, guestName: `Client ${id}`, ...extra });
const withReviews = (reviews, extra = {}) => hotel({ guestReviews: reviews, ...extra });
const answered = (ids) => Object.fromEntries(ids.map((id) => [id, { type: "courteous", day: 6, cost: 0 }]));

// A crisis broken by an unfavourable audit on ONSET.
const broken = (extra = {}) => advanceMediaCrisis(withAudit("warning", ONSET, DAY_NUMBER, extra), { date: ONSET, day: DAY_NUMBER });
const crisisOf = (hotelState) => activeCrisis(hotelState);
// A crisis the player has answered (an official statement), so that the silence of an unanswered one does not stretch it.
const settled = () => respondToCrisis({ hotelState: broken() }, "apology", { date: plus(ONSET, 1) }).hotelState;

const randomDate = (from = "2026-09-10") => {
  for (let i = 0; i < 4000; i += 1) {
    const iso = plus(from, i);
    if (mixedRandom(`media-crisis:${iso}`) < RANDOM_CHANCE) return iso;
  }
  throw new Error("no random date found");
};

describe("mediaCrisisEngine / when a crisis breaks", () => {
  it("is inert by default: nothing happens on an ordinary day", () => {
    const state = hotel();
    expect(advanceMediaCrisis(state, { date: "2026-09-12", day: DAY_NUMBER })).toBe(state);
    expect(activeCrisis(state)).toBeNull();
    expect(crisisHistory(state)).toEqual([]);
  });

  it("breaks after an unfavourable hygiene audit: food poisoning", () => {
    const crisis = crisisOf(broken());
    expect(crisis).toMatchObject({ kind: "food-poisoning", cause: "hygiene", status: "active", onsetDate: ONSET });
  });

  it.each(["ok", "label"])("does not break after a %s audit", (outcome) => {
    const state = withAudit(outcome);
    expect(advanceMediaCrisis(state, { date: ONSET, day: DAY_NUMBER })).toBe(state);
  });

  it("only reads the audit of the day just played", () => {
    const state = withAudit("warning", "2026-09-20", 6);
    expect(advanceMediaCrisis(state, { date: ONSET, day: DAY_NUMBER })).toBe(state);
  });

  it("breaks over a V.I.P.'s unanswered bad review: a scandal article", () => {
    const state = withReviews([review(1, 2, { profile: "vip", weight: 3 })]);
    expect(crisisOf(advanceMediaCrisis(state, { date: ONSET, day: DAY_NUMBER }))).toMatchObject({ kind: "vip-scandal", cause: "vip" });
  });

  it("a V.I.P.'s good review, or one already answered, breaks nothing", () => {
    const good = withReviews([review(1, 4, { profile: "vip" })]);
    expect(advanceMediaCrisis(good, { date: ONSET, day: DAY_NUMBER })).toBe(good);
    const handled = withReviews([review(1, 1, { profile: "vip" })], { reviewResponses: answered(["stay:1"]) });
    expect(advanceMediaCrisis(handled, { date: ONSET, day: DAY_NUMBER })).toBe(handled);
  });

  it("breaks over three unanswered 1-star reviews: bed bugs or hot water", () => {
    const state = withReviews([review(1, 1), review(2, 1), review(3, 1)]);
    const crisis = crisisOf(advanceMediaCrisis(state, { date: ONSET, day: DAY_NUMBER }));
    expect(crisis.cause).toBe("reviews");
    expect(["bedbugs", "hot-water"]).toContain(crisis.kind);
    expect([...crisis.sourceIds].sort()).toEqual(["review:stay:1", "review:stay:2", "review:stay:3"]);
  });

  it("two 1-star reviews are not enough, and 2-star ones do not count", () => {
    const two = withReviews([review(1, 1), review(2, 1), review(3, 2)]);
    expect(advanceMediaCrisis(two, { date: ONSET, day: DAY_NUMBER })).toBe(two);
  });

  it("answered 1-star reviews are not counted", () => {
    const state = withReviews([review(1, 1), review(2, 1), review(3, 1)], { reviewResponses: answered(["stay:3"]) });
    expect(advanceMediaCrisis(state, { date: ONSET, day: DAY_NUMBER })).toBe(state);
  });

  it("breaks out of the blue on the days the stable hash picks", () => {
    const date = randomDate();
    const crisis = crisisOf(advanceMediaCrisis(hotel(), { date, day: DAY_NUMBER }));
    expect(crisis).toMatchObject({ cause: "random", onsetDate: date, sourceIds: [] });
    expect(Object.keys({ "food-poisoning": 1, "vip-scandal": 1, bedbugs: 1, "hot-water": 1 })).toContain(crisis.kind);
  });

  it("rarely: about one day in a hundred", () => {
    let hits = 0;
    for (let i = 0; i < 1000; i += 1) if (crisisOf(advanceMediaCrisis(hotel(), { date: plus("2026-09-10", i), day: DAY_NUMBER }))) hits += 1;
    expect(hits).toBeGreaterThan(0);
    expect(hits / 1000).toBeLessThan(RANDOM_CHANCE * 3);
  });

  it(`never before day ${MIN_DAY}, whatever the cause`, () => {
    const audit = withAudit("warning", ONSET, MIN_DAY - 1);
    expect(advanceMediaCrisis(audit, { date: ONSET, day: MIN_DAY - 1 })).toBe(audit);
    const random = hotel();
    expect(advanceMediaCrisis(random, { date: randomDate(), day: MIN_DAY - 1 })).toBe(random);
  });

  it("never a second one while one is under way", () => {
    const first = broken();
    const again = advanceMediaCrisis({ ...first, guestReviews: [review(1, 1), review(2, 1), review(3, 1)] }, { date: plus(ONSET, 1), day: DAY_NUMBER + 1 });
    expect(activeCrisis(again).id).toBe(activeCrisis(first).id);
    expect(again.mediaCrisis.crises).toHaveLength(1);
  });

  it("the same review does not break a second crisis", () => {
    let state = withReviews([review(1, 1), review(2, 1), review(3, 1)]);
    state = advanceMediaCrisis(state, { date: ONSET, day: DAY_NUMBER });
    const end = plus(ONSET, 40);
    // Run the crisis to its end, then long past the cooldown: same reviews, no new crisis.
    for (let d = 1; d <= 40; d += 1) state = advanceMediaCrisis(state, { date: plus(ONSET, d), day: DAY_NUMBER + d });
    expect(activeCrisis(state)).toBeNull();
    expect(state.mediaCrisis.crises).toHaveLength(1);
    expect(dayIndexOf(end)).toBeGreaterThan(dayIndexOf(ONSET));
  });

  it(`waits ${COOLDOWN_DAYS} days after the last one ended`, () => {
    let state = broken();
    const endedOn = (s) => s.mediaCrisis.crises[0].endedOn;
    let d = 1;
    while (activeCrisis(state)) {
      state = advanceMediaCrisis(state, { date: plus(ONSET, d), day: DAY_NUMBER + d });
      d += 1;
    }
    const ended = endedOn(state);
    const audit = (date) => ({ ...state, hotelEvents: { today: null, audits: [{ id: `audit:${date}`, day: 99, date, score: 30, outcome: "warning", reputation: -4, untilDay: 120 }] } });
    const tooSoon = plus(ended, COOLDOWN_DAYS - 1);
    expect(activeCrisis(advanceMediaCrisis(audit(tooSoon), { date: tooSoon, day: 99 }))).toBeNull();
    const later = plus(ended, COOLDOWN_DAYS);
    expect(activeCrisis(advanceMediaCrisis(audit(later), { date: later, day: 99 }))).not.toBeNull();
  });
});

describe("mediaCrisisEngine / the crisis's numbers", () => {
  it("hits the reputation 15 to 25 points, the demand 30 to 50 % and lasts 5 to 10 days, whatever the day", () => {
    const peaks = new Set();
    const drops = new Set();
    const durations = new Set();
    for (let i = 0; i < 300; i += 1) {
      const date = plus("2026-09-10", i);
      const crisis = crisisOf(advanceMediaCrisis(withAudit("warning", date, DAY_NUMBER + i), { date, day: DAY_NUMBER + i }));
      const duration = dayIndexOf(crisis.endDate) - dayIndexOf(crisis.onsetDate);
      expect(crisis.peak).toBeGreaterThanOrEqual(PEAK_MIN);
      expect(crisis.peak).toBeLessThanOrEqual(PEAK_MIN + PEAK_SPAN - 1);
      expect(crisis.demandDrop).toBeGreaterThanOrEqual(DROP_MIN - 1e-9);
      expect(crisis.demandDrop).toBeLessThanOrEqual(0.5 + 1e-9);
      expect(duration).toBeGreaterThanOrEqual(DURATION_MIN);
      expect(duration).toBeLessThanOrEqual(DURATION_MIN + DURATION_SPAN - 1);
      peaks.add(crisis.peak);
      drops.add(crisis.demandDrop);
      durations.add(duration);
    }
    // Spread over the whole range, not stuck on one value.
    expect(peaks.size).toBeGreaterThan(6);
    expect(drops.size).toBeGreaterThan(6);
    expect(durations.size).toBeGreaterThan(3);
  });

  it("the demand is hit from the day after it breaks; the reputation, the night it breaks", () => {
    const crisis = crisisOf(broken());
    expect(crisis.startDate).toBe(plus(ONSET, 1));
    expect(crisis.baseReputation).toBe(70);
  });

  it("caps the reputation the night it breaks", () => {
    const state = broken();
    expect(state.progression.player.reputation).toBe(70 - crisisOf(state).peak);
  });

  it("leaves a reputation that is already lower than the cap alone, and copes with none at all", () => {
    let state = broken();
    state = { ...state, progression: { player: { reputation: 10 } } };
    state = advanceMediaCrisis(state, { date: plus(ONSET, 1), day: DAY_NUMBER + 1 });
    expect(state.progression.player.reputation).toBe(10);
    const none = advanceMediaCrisis(withAudit("warning", ONSET, DAY_NUMBER, { progression: undefined }), { date: ONSET, day: DAY_NUMBER });
    expect(activeCrisis(none)).not.toBeNull();
    expect(none.progression).toBeUndefined();
  });

  it("holds the reputation down by a penalty that fades linearly to nothing when the crisis ends", () => {
    let state = settled();
    const crisis = crisisOf(state);
    const end = dayIndexOf(crisis.endDate);
    const seen = [];
    for (let index = dayIndexOf(ONSET) + 1; index <= end; index += 1) {
      // The daily drift lifts the reputation back to where it was...
      state = { ...state, progression: { player: { reputation: 70 } } };
      state = advanceMediaCrisis(state, { date: toIsoDate(index * DAY), day: DAY_NUMBER + index - dayIndexOf(ONSET) });
      seen.push(state.progression.player.reputation);
      // ...and the cap pushes it under again.
      expect(state.progression.player.reputation).toBe(Math.round(70 - penaltyOn(crisis, index)));
    }
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(seen[0]).toBeLessThan(70 - crisis.peak / 2 - 1);
    expect(seen[seen.length - 1]).toBeGreaterThan(seen[0]);
    // The day after the end, nothing holds it down any more.
    const after = advanceMediaCrisis({ ...state, progression: { player: { reputation: 70 } } }, { date: toIsoDate((end + 1) * DAY), day: 200 });
    expect(after.progression.player.reputation).toBe(70);
  });

  it("penaltyOn is the full peak at the onset, nothing before or after", () => {
    const crisis = crisisOf(broken());
    expect(penaltyOn(crisis, ONSET)).toBe(crisis.peak);
    expect(penaltyOn(crisis, plus(ONSET, -1))).toBe(0);
    expect(penaltyOn(crisis, plus(crisis.endDate, 1))).toBe(0);
    expect(penaltyOn(crisis, crisis.endDate)).toBeGreaterThan(0);
    expect(penaltyOn(crisis, plus(ONSET, 1))).toBeLessThan(crisis.peak);
  });

  it("ends the crisis on its last day and records when", () => {
    let state = settled();
    const { endDate } = crisisOf(state);
    for (let index = dayIndexOf(ONSET) + 1; index <= dayIndexOf(endDate); index += 1) state = advanceMediaCrisis(state, { date: toIsoDate(index * DAY), day: DAY_NUMBER + 1 });
    expect(activeCrisis(state)).toBeNull();
    expect(crisisHistory(state)[0]).toMatchObject({ status: "ended", endedOn: endDate });
  });
});

describe("mediaCrisisEngine / demand", () => {
  it("is 1 without a crisis", () => {
    expect(mediaDemandFactor(hotel(), ONSET)).toBe(1);
  });

  it("falls by the crisis's drop on each day of the crisis, and only then", () => {
    const state = broken();
    const crisis = crisisOf(state);
    expect(mediaDemandFactor(state, ONSET)).toBe(1); // the day it breaks was already played
    expect(mediaDemandFactor(state, crisis.startDate)).toBeCloseTo(1 - crisis.demandDrop, 10);
    expect(mediaDemandFactor(state, crisis.endDate)).toBeCloseTo(1 - crisis.demandDrop, 10);
    expect(mediaDemandFactor(state, plus(crisis.endDate, 1))).toBe(1);
  });

  it("never falls below the maximum drop", () => {
    const state = broken();
    const crisis = { ...crisisOf(state), demandDrop: 0.9 };
    expect(mediaDemandFactor({ ...state, mediaCrisis: { ...state.mediaCrisis, crises: [crisis] } }, crisis.startDate)).toBeCloseTo(1 - MAX_DROP, 10);
  });

  it("ignores a crisis that is over", () => {
    let state = settled();
    const { startDate, endDate } = crisisOf(state);
    for (let index = dayIndexOf(ONSET) + 1; index <= dayIndexOf(endDate); index += 1) state = advanceMediaCrisis(state, { date: toIsoDate(index * DAY), day: DAY_NUMBER + 1 });
    expect(mediaDemandFactor(state, startDate)).toBe(1);
  });
});

describe("mediaCrisisEngine / the options", () => {
  const today = () => plus(ONSET, 1);

  it("offers the three answers with their cost", () => {
    const options = crisisOptions(broken(), today());
    expect(options.map((option) => [option.id, option.cost, option.available])).toEqual([["deny", 0, true], ["apology", APOLOGY_COST, true], ["audit", AUDIT_COST, true]]);
    options.forEach((option) => expect(option.reason).toBe(""));
  });

  it("offers nothing without a crisis", () => {
    expect(crisisOptions(hotel(), today())).toEqual([]);
  });

  it("a paid answer needs the treasury", () => {
    const poor = broken({ finance: { revenue: [5000], costs: [0] } });
    const options = crisisOptions(poor, today());
    expect(options.find((option) => option.id === "apology").available).toBe(true);
    expect(options.find((option) => option.id === "audit")).toMatchObject({ available: false, reason: "Trésorerie insuffisante" });
    expect(options.find((option) => option.id === "deny").available).toBe(true);
  });

  it("only one answer, once", () => {
    const answeredState = respondToCrisis({ hotelState: broken() }, "deny", { date: today() }).hotelState;
    crisisOptions(answeredState, today()).forEach((option) => expect(option).toMatchObject({ available: false, reason: "Vous avez déjà répondu à cette crise" }));
  });

  it("nothing left to answer once the crisis has run its course", () => {
    const state = broken();
    const { endDate } = crisisOf(state);
    crisisOptions(state, plus(endDate, 1)).forEach((option) => expect(option.available).toBe(false));
  });
});

describe("mediaCrisisEngine / denying", () => {
  const today = () => plus(ONSET, 1);

  it("is free and records the decision", () => {
    const bundle = { hotelState: broken(), rooms: [], reservations: [] };
    const next = respondToCrisis(bundle, "deny", { date: today(), day: 11 });
    expect(next.hotelState.finance.costs).toEqual([0]);
    expect(crisisOf(next.hotelState).decision).toMatchObject({ type: "deny", cost: 0, date: today() });
    expect(next.hotelState.mediaCrisis.lastOutcome.type).toBe("deny");
    expect(next.rooms).toEqual([]);
  });

  // Ids whose stable hash says a counter-expert shows up, and those whose does not.
  const idWith = (counter) => {
    for (let i = 1; i < 500; i += 1) if ((mixedRandom(`crisis-counter:crisis:${i}`) < COUNTER_EXPERTISE_CHANCE) === counter) return i;
    throw new Error("no id");
  };
  const stateWithId = (n) => {
    const state = broken();
    const crisis = { ...crisisOf(state), id: `crisis:${n}` };
    return { ...state, mediaCrisis: { ...state.mediaCrisis, crises: [crisis], nextId: n + 1 } };
  };

  it("when a counter-expert is due, it lands three days later and makes things worse, once", () => {
    let state = respondToCrisis({ hotelState: stateWithId(idWith(true)) }, "deny", { date: today() }).hotelState;
    const before = crisisOf(state);
    expect(before.worsensOn).toBe(plus(today(), 3));
    for (let d = 2; d < 5; d += 1) state = advanceMediaCrisis(state, { date: plus(ONSET, d), day: DAY_NUMBER + d });
    const after = crisisOf(state);
    expect(after.worsened).toBe(true);
    expect(after.peak).toBe(before.peak + WORSEN_EXTRA_PEAK);
    expect(after.demandDrop).toBeCloseTo(Math.min(MAX_DROP, before.demandDrop + WORSEN_EXTRA_DROP), 10);
    expect(dayIndexOf(after.endDate) - dayIndexOf(before.endDate)).toBe(WORSEN_EXTRA_DAYS);
    // Only once.
    const again = advanceMediaCrisis(state, { date: plus(ONSET, 6), day: DAY_NUMBER + 6 });
    expect(crisisOf(again).peak).toBe(after.peak);
    expect(crisisOf(again).endDate).toBe(after.endDate);
  });

  it("when none is due, the denial stands", () => {
    let state = respondToCrisis({ hotelState: stateWithId(idWith(false)) }, "deny", { date: today() }).hotelState;
    const before = crisisOf(state);
    expect(before.worsensOn).toBeUndefined();
    for (let d = 2; d < 6; d += 1) state = advanceMediaCrisis(state, { date: plus(ONSET, d), day: DAY_NUMBER + d });
    expect(crisisOf(state)).toMatchObject({ peak: before.peak, endDate: before.endDate });
    expect(crisisOf(state).worsened).toBeFalsy();
  });

  it("about two crises in five have a counter-expert", () => {
    let due = 0;
    for (let i = 1; i <= 1000; i += 1) if (mixedRandom(`crisis-counter:crisis:${i}`) < COUNTER_EXPERTISE_CHANCE) due += 1;
    expect(due / 1000).toBeGreaterThan(0.33);
    expect(due / 1000).toBeLessThan(0.47);
  });
});

describe("mediaCrisisEngine / the official statement", () => {
  const today = () => plus(ONSET, 1);
  const lengthOf = (state) => describeCrisis(crisisOf(state), today()).daysLeft;

  it("costs 2 000 EUR from the treasury", () => {
    const next = respondToCrisis({ hotelState: broken() }, "apology", { date: today() }).hotelState;
    expect(next.finance.costs).toEqual([APOLOGY_COST]);
  });

  it("halves what is left of the crisis (rounding up)", () => {
    for (let i = 0; i < 40; i += 1) {
      const date = plus("2026-09-10", i);
      const state = advanceMediaCrisis(withAudit("warning", date, DAY_NUMBER + i), { date, day: DAY_NUMBER + i });
      const morning = plus(date, 1);
      const left = describeCrisis(crisisOf(state), morning).daysLeft;
      const next = respondToCrisis({ hotelState: state }, "apology", { date: morning }).hotelState;
      expect(describeCrisis(crisisOf(next), morning).daysLeft).toBe(Math.ceil(left / 2));
    }
  });

  it("lowers the reputation penalty as well, and ends the demand drop sooner", () => {
    const state = broken();
    const before = crisisOf(state);
    const next = respondToCrisis({ hotelState: state }, "apology", { date: today() }).hotelState;
    const after = crisisOf(next);
    expect(dayIndexOf(after.endDate)).toBeLessThan(dayIndexOf(before.endDate));
    expect(mediaDemandFactor(next, before.endDate)).toBe(1);
    expect(mediaDemandFactor(next, after.endDate)).toBeLessThan(1);
    expect(penaltyOn(after, plus(ONSET, 2))).toBeLessThan(penaltyOn(before, plus(ONSET, 2)));
  });

  it("says how long the crisis will last now", () => {
    const next = respondToCrisis({ hotelState: broken() }, "apology", { date: today(), day: 11 }).hotelState;
    expect(next.mediaCrisis.lastOutcome.text).toMatch(/ne devrait plus durer que \d+ jours?/);
    expect(lengthOf(next)).toBeGreaterThan(0);
  });

  it("does nothing when the treasury cannot pay", () => {
    const bundle = { hotelState: broken({ finance: { revenue: [500], costs: [0] } }) };
    expect(respondToCrisis(bundle, "apology", { date: today() })).toBe(bundle);
  });
});

describe("mediaCrisisEngine / the independent audits", () => {
  const today = () => plus(ONSET, 1);
  const audited = () => respondToCrisis({ hotelState: broken() }, "audit", { date: today(), day: 11 }).hotelState;

  it("costs 8 000 EUR", () => {
    expect(audited().finance.costs).toEqual([AUDIT_COST]);
  });

  it("does nothing when the treasury cannot pay", () => {
    const bundle = { hotelState: broken({ finance: { revenue: [7999], costs: [0] } }) };
    expect(respondToCrisis(bundle, "audit", { date: today() })).toBe(bundle);
  });

  it("stops the crisis at once: no active crisis, no demand drop, no more reputation cap", () => {
    const state = audited();
    expect(activeCrisis(state)).toBeNull();
    expect(crisisHistory(state)[0]).toMatchObject({ status: "resolved", resolvedByAudit: true, endedOn: today() });
    expect(mediaDemandFactor(state, today())).toBeGreaterThanOrEqual(1);
    const later = advanceMediaCrisis({ ...state, progression: { player: { reputation: 70 } } }, { date: today(), day: 11 });
    expect(later.progression.player.reputation).toBe(70);
  });

  it("launches the rehabilitation campaign: +15 % demand fading over ten days", () => {
    const state = audited();
    expect(rehabilitation(state)).toEqual({ startDate: today(), endDate: plus(today(), REHAB_DAYS - 1), boost: REHAB_BOOST });
    expect(mediaDemandFactor(state, today())).toBeCloseTo(1 + REHAB_BOOST, 10);
    const factors = Array.from({ length: REHAB_DAYS }, (_, i) => mediaDemandFactor(state, plus(today(), i)));
    expect(factors).toEqual([...factors].sort((a, b) => b - a));
    expect(factors[REHAB_DAYS - 1]).toBeGreaterThan(1);
    expect(mediaDemandFactor(state, plus(today(), REHAB_DAYS))).toBe(1);
  });

  it("puts « L'hôtel le plus sûr de la ville » on the front page", () => {
    const state = audited();
    expect(state.pressHighlights).toHaveLength(1);
    expect(state.pressHighlights[0]).toMatchObject({ headline: expect.stringContaining("le plus sûr de la ville"), day: 11 });
  });

  it("keeps the press articles already there", () => {
    const state = respondToCrisis({ hotelState: broken({ pressHighlights: [{ id: "press:old", day: 2, headline: "Ancien", text: "x" }] }) }, "audit", { date: today(), day: 11 }).hotelState;
    expect(state.pressHighlights.map((article) => article.id)).toEqual(["press:old", expect.stringContaining("press:crisis")]);
  });

  it("counts as the end of the crisis for the cooldown", () => {
    expect(audited().mediaCrisis.crises[0].endedOn).toBe(today());
  });
});

describe("mediaCrisisEngine / silence", () => {
  it("feeds the press: two more days once two days pass with no answer", () => {
    let state = broken();
    const before = crisisOf(state).endDate;
    state = advanceMediaCrisis(state, { date: plus(ONSET, 1), day: DAY_NUMBER + 1 });
    expect(crisisOf(state).silenceExtended).toBeFalsy();
    state = advanceMediaCrisis(state, { date: plus(ONSET, 2), day: DAY_NUMBER + 2 });
    expect(crisisOf(state).silenceExtended).toBe(true);
    expect(dayIndexOf(crisisOf(state).endDate) - dayIndexOf(before)).toBe(SILENCE_EXTRA_DAYS);
    // Once.
    state = advanceMediaCrisis(state, { date: plus(ONSET, 3), day: DAY_NUMBER + 3 });
    expect(dayIndexOf(crisisOf(state).endDate) - dayIndexOf(before)).toBe(SILENCE_EXTRA_DAYS);
  });

  it("an answer, any answer, spares the player that", () => {
    let state = respondToCrisis({ hotelState: broken() }, "deny", { date: plus(ONSET, 1) }).hotelState;
    const before = crisisOf(state).endDate;
    state = advanceMediaCrisis(state, { date: plus(ONSET, 2), day: DAY_NUMBER + 2 });
    expect(crisisOf(state).endDate).toBe(before);
  });
});

describe("mediaCrisisEngine / how the interface reads it", () => {
  it("describes the crisis at a date", () => {
    const state = broken();
    const described = describeActiveCrisis(state, plus(ONSET, 1));
    const crisis = crisisOf(state);
    expect(described).toMatchObject({
      kind: "food-poisoning",
      icon: "🤢",
      title: "Intoxication alimentaire au restaurant",
      cause: "hygiene",
      causeText: "un contrôle d'hygiène défavorable",
      status: "active",
      peak: crisis.peak,
      demandDropPercent: Math.round(crisis.demandDrop * 100),
      decided: false,
      decision: null,
    });
    expect(described.daysLeft).toBe(dayIndexOf(crisis.endDate) - dayIndexOf(crisis.startDate) + 1);
    expect(described.reputationPenalty).toBeLessThanOrEqual(crisis.peak);
  });

  it("counts the days left down as time goes by", () => {
    const state = broken();
    const first = describeCrisis(crisisOf(state), plus(ONSET, 1)).daysLeft;
    expect(describeCrisis(crisisOf(state), plus(ONSET, 3)).daysLeft).toBe(first - 2);
    expect(describeCrisis(crisisOf(state), plus(ONSET, 60)).daysLeft).toBe(0);
  });

  it("is null when there is no crisis", () => {
    expect(describeCrisis(null, ONSET)).toBeNull();
    expect(describeActiveCrisis(hotel(), ONSET)).toBeNull();
  });

  it("gives the reputation penalty of the day", () => {
    const state = broken();
    expect(reputationPenaltyOn(state, ONSET)).toBe(crisisOf(state).peak);
    expect(reputationPenaltyOn(hotel(), ONSET)).toBe(0);
  });

  it("tells the news of the day: the crisis breaking, and its end", () => {
    let state = settled();
    const news = crisisNewsOn(state, ONSET);
    expect(news).toHaveLength(1);
    expect(news[0]).toMatch(/Crise médiatique : Intoxication alimentaire au restaurant/);
    expect(news[0]).toContain(`chute de ${crisisOf(state).peak} points`);
    expect(crisisNewsOn(state, plus(ONSET, 1))).toEqual([]);
    const { endDate } = crisisOf(state);
    for (let index = dayIndexOf(ONSET) + 1; index <= dayIndexOf(endDate); index += 1) state = advanceMediaCrisis(state, { date: toIsoDate(index * DAY), day: 12 });
    expect(crisisNewsOn(state, endDate).join(" ")).toMatch(/est terminée/);
  });

  it("tells about a counter-expertise and about silence", () => {
    let state = broken();
    state = advanceMediaCrisis(state, { date: plus(ONSET, 2), day: 12 });
    expect(crisisNewsOn(state, plus(ONSET, 2)).join(" ")).toMatch(/silence/i);
  });

  it("does not say a crisis ended when an audit ended it", () => {
    const state = respondToCrisis({ hotelState: broken() }, "audit", { date: plus(ONSET, 1) }).hotelState;
    expect(crisisNewsOn(state, plus(ONSET, 1))).toEqual([]);
  });
});

describe("mediaCrisisEngine / purity", () => {
  it("is deterministic and leaves its input alone", () => {
    const input = withAudit();
    const frozen = JSON.stringify(input);
    const first = advanceMediaCrisis(input, { date: ONSET, day: DAY_NUMBER });
    const second = advanceMediaCrisis(input, { date: ONSET, day: DAY_NUMBER });
    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(frozen);
    expect(input.mediaCrisis).toBeUndefined();
  });

  it("answering leaves the previous state alone", () => {
    const state = broken();
    const frozen = JSON.stringify(state);
    respondToCrisis({ hotelState: state }, "audit", { date: plus(ONSET, 1) });
    expect(JSON.stringify(state)).toBe(frozen);
  });

  it("ignores an unknown answer, and a state with no crisis", () => {
    const bundle = { hotelState: broken() };
    expect(respondToCrisis(bundle, "bribe", { date: plus(ONSET, 1) })).toBe(bundle);
    const quiet = { hotelState: hotel() };
    expect(respondToCrisis(quiet, "deny", { date: ONSET })).toBe(quiet);
  });

  it("keeps a bounded history", () => {
    let state = hotel();
    for (let i = 0; i < 30; i += 1) {
      const date = plus("2026-09-10", i * 40);
      state = { ...state, hotelEvents: { today: null, audits: [{ id: `audit:${date}`, day: 20 + i, date, score: 30, outcome: "warning", reputation: -4, untilDay: 90 }] } };
      state = advanceMediaCrisis(state, { date, day: 20 + i });
      state = respondToCrisis({ hotelState: state }, "audit", { date: plus(date, 1) }).hotelState;
    }
    expect(state.mediaCrisis.crises.length).toBeLessThanOrEqual(10);
  });
});

describe("mediaCrisisEngine / the hold on the reputation", () => {
  it("is the penalty the cap set the evening before, and nothing without a crisis", () => {
    const state = broken();
    const crisis = crisisOf(state);
    expect(reputationHoldOn(state, plus(ONSET, 1))).toBe(crisis.peak);
    expect(reputationHoldOn(state, plus(ONSET, 2))).toBeLessThan(crisis.peak);
    expect(reputationHoldOn(hotel(), ONSET)).toBe(0);
  });

  it("the audits give the reputation back with the crisis", () => {
    const state = broken();
    expect(state.progression.player.reputation).toBeLessThan(70);
    const next = respondToCrisis({ hotelState: state }, "audit", { date: plus(ONSET, 1) }).hotelState;
    expect(next.progression.player.reputation).toBe(70);
  });

  it("the audits never lower a reputation that is already higher", () => {
    const state = { ...broken(), progression: { player: { reputation: 90 } } };
    expect(respondToCrisis({ hotelState: state }, "audit", { date: plus(ONSET, 1) }).hotelState.progression.player.reputation).toBe(90);
  });

  it("a statement leaves the reputation to recover on its own", () => {
    const state = broken();
    const low = state.progression.player.reputation;
    expect(respondToCrisis({ hotelState: state }, "apology", { date: plus(ONSET, 1) }).hotelState.progression.player.reputation).toBe(low);
  });
});
