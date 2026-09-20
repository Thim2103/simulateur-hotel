import {
  RATING_IMPACT,
  RESPONSE_TYPES,
  MAX_STORED_REVIEWS,
  MAX_NEW_REVIEWS_PER_DAY,
  MAX_DEMAND_SHIFT,
  INCIDENT_GESTURE_COST,
  baseImpact,
  effectiveImpact,
  listReviews,
  findReview,
  reviewsPostedOn,
  currentImpact,
  pendingReputationDelta,
  pendingDemandShift,
  unansweredNegativeReviews,
  responseOptions,
  respondToReview,
  reviewsForDepartures,
  advanceGuestReviews,
  describeReview,
} from "./guestReviewEngine";
import { isVip, PROFILES } from "./guestProfiles";
import { treasuryOf } from "../finance/investmentFunding";

const DATE = new Date("2026-09-12T12:00:00Z");
const ids = (count) => Array.from({ length: count }, (_, i) => i + 1);
const room = (id, type = "standard") => ({ id, number: String(100 + id), type, status: "libre", price: 100 });
const leaving = (id, extra = {}) => ({ id, room_id: id, client_name: `Client ${id}`, arrival: "2026-09-10", departure: "2026-09-12", status: "confirmée", segment: "leisure", price: 110, ...extra });
const rich = (extra = {}) => ({ finance: { revenue: [10000], costs: [0] }, ...extra });

// A stored stay review, built by hand so a test doesn't depend on the hash.
const review = (id, rating, extra = {}) => ({
  id: `stay:${id}`,
  source: "stay",
  reservationId: id,
  guestName: `Client ${id}`,
  profile: "family",
  weight: 1,
  roomNumber: "101",
  nights: 2,
  nightPrice: 110,
  rating,
  text: "…",
  day: 3,
  date: "2026-09-12",
  impact: baseImpact(rating, 1),
  applied: 0,
  ...extra,
});
const stateWith = (reviews, extra = {}) => ({ ...rich(), guestReviews: reviews, ...extra });
const bundleOf = (hotelState) => ({ hotelState });

describe("guestReviewEngine / impact of a review", () => {
  it("is worth more reputation the better the rating: +0.6 / +0.3 / 0 / -0.6 / -1.2", () => {
    expect(RATING_IMPACT).toEqual({ 5: 0.6, 4: 0.3, 3: 0, 2: -0.6, 1: -1.2 });
    expect([5, 4, 3, 2, 1].map((rating) => baseImpact(rating))).toEqual([0.6, 0.3, 0, -0.6, -1.2]);
  });

  it("a V.I.P.'s review counts three times as much", () => {
    expect(baseImpact(1, 3)).toBe(-3.6);
    expect(baseImpact(5, 3)).toBe(1.8);
    expect(baseImpact(3, 3)).toBe(0);
  });

  it("copes with a rating out of range", () => {
    expect(baseImpact(9)).toBe(0.6);
    expect(baseImpact(-4)).toBe(-1.2);
    expect(baseImpact(undefined)).toBe(0);
  });
});

describe("guestReviewEngine / what an answer does", () => {
  const bad = -1.2;

  it("a courteous reply takes 0.5 off a bad review (never turning it into a gain)", () => {
    expect(effectiveImpact(bad, 1, "courteous")).toBe(-0.7);
    expect(effectiveImpact(-0.3, 1, "courteous")).toBe(0);
  });

  it("a commercial gesture wipes out nearly all of it", () => {
    expect(effectiveImpact(bad, 1, "gesture")).toBe(-0.1);
    expect(Math.abs(effectiveImpact(-3.6, 3, "gesture"))).toBeLessThanOrEqual(0.4);
  });

  it("ignoring a bad review makes it worse", () => {
    expect(effectiveImpact(bad, 1, "ignore")).toBe(-1.5);
  });

  it("an aggressive reply makes it much worse", () => {
    expect(effectiveImpact(bad, 1, "aggressive")).toBe(-2.3);
    expect(effectiveImpact(bad, 1, "aggressive")).toBeLessThan(effectiveImpact(bad, 1, "ignore"));
  });

  it("the order from best to worst answer to a bad review", () => {
    const at = (type) => effectiveImpact(bad, 1, type);
    expect(at("gesture")).toBeGreaterThan(at("courteous"));
    expect(at("courteous")).toBeGreaterThan(bad);
    expect(bad).toBeGreaterThan(at("ignore"));
    expect(at("ignore")).toBeGreaterThan(at("aggressive"));
  });

  it("an answer scales with a V.I.P.'s weight", () => {
    expect(effectiveImpact(-3.6, 3, "courteous")).toBe(-2.1);
    expect(effectiveImpact(-3.6, 3, "aggressive")).toBe(-6.9);
  });

  it("a good review can be thanked for a little extra, and nothing else changes it", () => {
    expect(effectiveImpact(0.6, 1, "courteous")).toBe(0.8);
    expect(effectiveImpact(0.6, 1, "ignore")).toBe(0.6);
    expect(effectiveImpact(1.8, 3, "courteous")).toBe(2.4); // a V.I.P.'s 5-star review
  });

  it("no answer, no change", () => {
    expect(effectiveImpact(bad, 1, undefined)).toBe(bad);
  });
});

describe("guestReviewEngine / the reviews of departing guests", () => {
  const rooms = ids(60).map((id) => room(id));
  const reservations = ids(60).map((id) => leaving(id));
  const make = (extra = {}) => reviewsForDepartures({ hotelState: {}, reservations, rooms, date: DATE, day: 5, ...extra });

  it("about half of the guests leaving write one, and never more than a handful a day", () => {
    const all = reviewsForDepartures({ hotelState: {}, reservations: reservations.slice(0, 5), rooms, date: DATE, day: 5 });
    expect(make().length).toBe(MAX_NEW_REVIEWS_PER_DAY);
    expect(all.length).toBeLessThanOrEqual(5);
    let posted = 0;
    ids(60).forEach((id) => (posted += reviewsForDepartures({ hotelState: {}, reservations: [leaving(id)], rooms, date: DATE, day: 5 }).length));
    expect(posted).toBeGreaterThan(15);
    expect(posted).toBeLessThan(45);
  });

  it("only the guests who leave today, not cancelled ones", () => {
    expect(reviewsForDepartures({ hotelState: {}, reservations: ids(30).map((id) => leaving(id, { departure: "2026-09-13" })), rooms, date: DATE, day: 5 })).toEqual([]);
    expect(reviewsForDepartures({ hotelState: {}, reservations: ids(30).map((id) => leaving(id, { status: "annulée" })), rooms, date: DATE, day: 5 })).toEqual([]);
  });

  it("each review carries the guest, their profile and weight, the room, the day and its impact", () => {
    const first = make()[0];
    expect(first).toMatchObject({ source: "stay", day: 5, date: "2026-09-12", applied: 0 });
    expect(first.id).toBe(`stay:${first.reservationId}`);
    expect(first.guestName).toBe(`Client ${first.reservationId}`);
    expect(Object.keys(PROFILES)).toContain(first.profile);
    expect(first.weight).toBe(PROFILES[first.profile].weight);
    expect(first.roomNumber).toBeTruthy();
    expect(first.rating).toBeGreaterThanOrEqual(1);
    expect(first.rating).toBeLessThanOrEqual(5);
    expect(first.impact).toBe(baseImpact(first.rating, first.weight));
    expect(first.text.length).toBeGreaterThan(10);
  });

  it("the gesture costs a night of what the guest paid", () => {
    expect(make()[0].nightPrice).toBe(110);
  });

  it("is deterministic", () => {
    expect(make()).toEqual(make());
  });

  it("a V.I.P. always writes, and is never lukewarm", () => {
    const suites = ids(400).map((id) => room(id, "suite"));
    const vips = ids(400).filter((id) => isVip(leaving(id), suites[id - 1]));
    expect(vips.length).toBeGreaterThan(10);
    vips.slice(0, 40).forEach((id) => {
      const [written] = reviewsForDepartures({ hotelState: {}, reservations: [leaving(id)], rooms: suites, date: DATE, day: 5 });
      expect(written.profile).toBe("vip");
      expect(written.weight).toBe(3);
      expect(written.rating === 5 || written.rating <= 3).toBe(true);
    });
  });

  it("a neglected hotel gets worse reviews than a well-kept one", () => {
    const average = (hotelState) => {
      const ratings = ids(60).flatMap((id) => reviewsForDepartures({ hotelState, reservations: [leaving(id)], rooms, date: DATE, day: 5 }).map((r) => r.rating));
      return ratings.reduce((a, b) => a + b, 0) / ratings.length;
    };
    const neglected = { maintenance: { level: "economy", condition: 20 }, activeIncidents: [{ id: "i", status: "active", severity: "moderate", daysOpen: 2 }] };
    const pristine = { maintenance: { level: "premium", condition: 95 } };
    expect(average(neglected)).toBeLessThan(average({}));
    expect(average(pristine)).toBeGreaterThan(average({}));
  });

  it("a normal hotel earns mostly good reviews, with the occasional bad stay", () => {
    const ratings = ids(200).flatMap((id) => reviewsForDepartures({ hotelState: {}, reservations: [leaving(id)], rooms: ids(200).map((i) => room(i)), date: DATE, day: 5 }).map((r) => r.rating));
    expect(ratings.filter((rating) => rating >= 4).length / ratings.length).toBeGreaterThan(0.5);
    expect(ratings.filter((rating) => rating <= 2).length).toBeGreaterThan(0);
  });

  it("the wording depends on the rating and the profile", () => {
    const positive = ids(200).flatMap((id) => reviewsForDepartures({ hotelState: {}, reservations: [leaving(id, { segment: "business" })], rooms: ids(200).map((i) => room(i)), date: DATE, day: 5 }));
    const business = positive.filter((r) => r.profile === "business");
    expect(business.filter((r) => r.rating >= 4).every((r) => /professionnel|fluide|efficace/i.test(r.text))).toBe(true);
  });
});

describe("guestReviewEngine / the list the player reads", () => {
  it("is empty for a hotel with no review", () => {
    expect(listReviews({})).toEqual([]);
    expect(listReviews(undefined)).toEqual([]);
  });

  it("puts the stay reviews and the breakdown reviews together, newest first", () => {
    const state = stateWith([review(1, 4, { day: 2 }), review(2, 2, { day: 5 })], { incidentReviews: [{ id: "review:i1:4", incidentId: "i1", zone: "laundry", severity: "moderate", day: 4, rating: 2, text: "Buanderie HS" }] });
    expect(listReviews(state).map((r) => r.id)).toEqual(["stay:2", "review:i1:4", "stay:1"]);
  });

  it("a breakdown review is worth its rating's impact, already counted through the incident penalties", () => {
    const state = { incidentReviews: [{ id: "review:i1:4", incidentId: "i1", zone: "laundry", day: 4, rating: 1, text: "HS" }] };
    const [incident] = listReviews(state);
    expect(incident).toMatchObject({ source: "incident", impact: -1.2, applied: -1.2, weight: 1, response: null, nightPrice: INCIDENT_GESTURE_COST });
    expect(pendingReputationDelta(state)).toBe(0);
  });

  it("finds a review by id, and the ones posted on a day", () => {
    const state = stateWith([review(1, 4, { day: 2 }), review(2, 2, { day: 5 })]);
    expect(findReview(state, "stay:2").rating).toBe(2);
    expect(findReview(state, "stay:9")).toBeNull();
    expect(reviewsPostedOn(state, 5).map((r) => r.id)).toEqual(["stay:2"]);
  });

  it("the bad ones still unanswered are the ones to deal with", () => {
    const state = stateWith([review(1, 5), review(2, 1), review(3, 2), review(4, 3)], { reviewResponses: { "stay:3": { type: "courteous", day: 3, cost: 0 } } });
    expect(unansweredNegativeReviews(state).map((r) => r.id)).toEqual(["stay:2"]);
  });

  it("describes a review with its profile and what it is worth now", () => {
    const described = describeReview({ ...listReviews(stateWith([review(1, 1)]))[0] });
    expect(described.profileInfo).toBe(PROFILES.family);
    expect(described.currentImpact).toBe(-1.2);
  });
});

describe("guestReviewEngine / pending impact", () => {
  it("a fresh review is pending: it lands once, in the next day's reputation", () => {
    const state = stateWith([review(1, 1), review(2, 5)]);
    expect(pendingReputationDelta(state)).toBeCloseTo(-1.2 + 0.6);
  });

  it("a V.I.P.'s review dominates the pending total", () => {
    const state = stateWith([review(1, 1, { profile: "vip", weight: 3, impact: baseImpact(1, 3) }), review(2, 5)]);
    expect(pendingReputationDelta(state)).toBeCloseTo(-3.6 + 0.6);
  });

  it("the same points shift tomorrow's demand: 1 point = 1 %", () => {
    expect(pendingDemandShift(stateWith([review(1, 1, { profile: "vip", weight: 3, impact: baseImpact(1, 3) })]))).toBeCloseTo(-0.036);
    expect(pendingDemandShift(stateWith([review(1, 5)]))).toBeCloseTo(0.006);
  });

  it("the demand shift is capped", () => {
    const many = ids(30).map((id) => review(id, 1, { profile: "vip", weight: 3, impact: baseImpact(1, 3) }));
    expect(pendingDemandShift(stateWith(many))).toBe(-MAX_DEMAND_SHIFT);
  });

  it("nothing is pending once the reviews are settled", () => {
    const state = advanceGuestReviews(stateWith([review(1, 1)]), { date: DATE, day: 4, reservations: [], rooms: [] });
    expect(pendingReputationDelta(state)).toBe(0);
    expect(pendingDemandShift(state)).toBe(0);
  });

  it("an answer given before the day is settled is included in what lands", () => {
    const state = respondToReview(bundleOf(stateWith([review(1, 1)])), "stay:1", "gesture", { day: 3 }).hotelState;
    expect(pendingReputationDelta(state)).toBeCloseTo(-0.1);
  });

  it("an answer given after the impact was applied corrects it the next day", () => {
    let state = advanceGuestReviews(stateWith([review(1, 1)]), { date: DATE, day: 4, reservations: [], rooms: [] });
    expect(pendingReputationDelta(state)).toBe(0);
    state = respondToReview(bundleOf(state), "stay:1", "gesture", { day: 4 }).hotelState;
    expect(pendingReputationDelta(state)).toBeCloseTo(1.1); // -1.2 was applied, -0.1 is what is left
    state = advanceGuestReviews(state, { date: DATE, day: 5, reservations: [], rooms: [] });
    expect(pendingReputationDelta(state)).toBe(0);
  });

  it("a hostile answer given late adds to the damage", () => {
    let state = advanceGuestReviews(stateWith([review(1, 1)]), { date: DATE, day: 4, reservations: [], rooms: [] });
    state = respondToReview(bundleOf(state), "stay:1", "aggressive", { day: 4 }).hotelState;
    expect(pendingReputationDelta(state)).toBeCloseTo(-1.1);
  });
});

describe("guestReviewEngine / answering", () => {
  const bad = () => stateWith([review(1, 1)]);
  const option = (state, id, type) => responseOptions(state, findReview(state, id)).find((item) => item.type === type);

  it("offers the four answers to a bad review, with cost and resulting impact", () => {
    const options = responseOptions(bad(), findReview(bad(), "stay:1"));
    expect(options.map((item) => item.type)).toEqual(["courteous", "gesture", "ignore", "aggressive"]);
    expect(options.find((item) => item.type === "courteous")).toMatchObject({ cost: 0, resulting: -0.7, available: true });
    expect(options.find((item) => item.type === "gesture")).toMatchObject({ cost: 110, resulting: -0.1, available: true });
    expect(options.find((item) => item.type === "aggressive").resulting).toBeLessThan(-1.2);
  });

  it("a good review can only be thanked or left alone", () => {
    const state = stateWith([review(1, 5)]);
    expect(responseOptions(state, findReview(state, "stay:1")).map((item) => item.type)).toEqual(["courteous", "ignore"]);
  });

  it("a lukewarm review can get a gesture but not an aggressive reply", () => {
    const state = stateWith([review(1, 3)]);
    expect(responseOptions(state, findReview(state, "stay:1")).map((item) => item.type)).toEqual(["courteous", "gesture", "ignore"]);
  });

  it("a courteous answer is free and recorded", () => {
    const next = respondToReview(bundleOf(bad()), "stay:1", "courteous", { day: 6 }).hotelState;
    expect(next.reviewResponses["stay:1"]).toMatchObject({ type: "courteous", day: 6, cost: 0 });
    expect(next.finance).toEqual(bad().finance);
    expect(currentImpact(findReview(next, "stay:1"))).toBe(-0.7);
  });

  it("a gesture is paid from the treasury, as a one-off cost of the month", () => {
    const before = bad();
    const next = respondToReview(bundleOf(before), "stay:1", "gesture", { day: 6 }).hotelState;
    expect(next.finance.costs).toEqual([110]);
    expect(treasuryOf(next)).toBe(treasuryOf(before) - 110);
    expect(next.reviewResponses["stay:1"]).toMatchObject({ type: "gesture", cost: 110 });
  });

  it("is refused, changing nothing, when the treasury can't pay", () => {
    const poor = stateWith([review(1, 1)], { finance: { revenue: [50], costs: [0] } });
    expect(option(poor, "stay:1", "gesture")).toMatchObject({ available: false, reason: "Trésorerie insuffisante" });
    const bundle = bundleOf(poor);
    expect(respondToReview(bundle, "stay:1", "gesture", { day: 6 })).toBe(bundle);
  });

  it("but a free answer never needs money", () => {
    const poor = stateWith([review(1, 1)], { finance: { revenue: [0], costs: [0] } });
    expect(option(poor, "stay:1", "courteous").available).toBe(true);
  });

  it("only one answer per review", () => {
    const answered = respondToReview(bundleOf(bad()), "stay:1", "courteous", { day: 6 });
    expect(option(answered.hotelState, "stay:1", "gesture")).toMatchObject({ available: false, reason: "Déjà répondu" });
    expect(respondToReview(answered, "stay:1", "gesture", { day: 7 })).toBe(answered);
  });

  it("refuses an answer that doesn't apply, an unknown answer and an unknown review", () => {
    const good = bundleOf(stateWith([review(1, 5)]));
    expect(respondToReview(good, "stay:1", "aggressive", { day: 6 })).toBe(good);
    expect(respondToReview(good, "stay:1", "flowers", { day: 6 })).toBe(good);
    expect(respondToReview(good, "stay:99", "courteous", { day: 6 })).toBe(good);
  });

  it("does not mutate its input", () => {
    const bundle = bundleOf(bad());
    const snapshot = JSON.stringify(bundle);
    respondToReview(bundle, "stay:1", "gesture", { day: 6 });
    expect(JSON.stringify(bundle)).toBe(snapshot);
  });

  it("can answer a breakdown review too, for a set gesture cost, and it moves nothing until then", () => {
    const state = { ...rich(), incidentReviews: [{ id: "review:i1:4", incidentId: "i1", zone: "laundry", day: 4, rating: 1, text: "HS" }] };
    const options = responseOptions(state, findReview(state, "review:i1:4"));
    expect(options.find((item) => item.type === "gesture").cost).toBe(INCIDENT_GESTURE_COST);
    const next = respondToReview(bundleOf(state), "review:i1:4", "gesture", { day: 5 }).hotelState;
    expect(pendingReputationDelta(next)).toBeCloseTo(1.1);
    expect(next.finance.costs).toEqual([INCIDENT_GESTURE_COST]);
    expect(pendingReputationDelta(advanceGuestReviews(next, { date: DATE, day: 6, reservations: [], rooms: [] }))).toBe(0);
  });

  it("the answer types are described for the player", () => {
    expect(Object.keys(RESPONSE_TYPES)).toEqual(["courteous", "gesture", "ignore", "aggressive"]);
    Object.values(RESPONSE_TYPES).forEach((type) => expect(type.label && type.description).toBeTruthy());
  });
});

describe("guestReviewEngine / the daily pass", () => {
  const rooms = ids(30).map((id) => room(id));
  const reservations = ids(30).map((id) => leaving(id));

  it("posts the reviews of today's departures, as pending", () => {
    const next = advanceGuestReviews({}, { date: DATE, day: 5, reservations, rooms });
    expect(next.guestReviews.length).toBeGreaterThan(0);
    expect(next.guestReviews.every((r) => r.day === 5 && r.applied === 0)).toBe(true);
  });

  it("settles yesterday's reviews and posts today's in the same pass", () => {
    const first = advanceGuestReviews({}, { date: DATE, day: 5, reservations, rooms });
    const second = advanceGuestReviews(first, { date: new Date("2026-09-13T12:00:00Z"), day: 6, reservations: reservations.map((r) => ({ ...r, id: r.id + 100, room_id: r.room_id, departure: "2026-09-13" })), rooms });
    const yesterday = second.guestReviews.filter((r) => r.day === 5);
    const today = second.guestReviews.filter((r) => r.day === 6);
    expect(yesterday.length).toBeGreaterThan(0);
    expect(yesterday.every((r) => r.applied === r.impact)).toBe(true);
    expect(today.every((r) => r.applied === 0)).toBe(true);
  });

  it("does not post the same stay twice", () => {
    const once = advanceGuestReviews({}, { date: DATE, day: 5, reservations, rooms });
    const twice = advanceGuestReviews(once, { date: DATE, day: 5, reservations, rooms });
    expect(twice.guestReviews.map((r) => r.id)).toEqual(once.guestReviews.map((r) => r.id));
  });

  it("a hotel with no departures and no reviews is left untouched", () => {
    const state = { finance: {} };
    expect(advanceGuestReviews(state, { date: DATE, day: 5, reservations: [], rooms })).toBe(state);
  });

  it("keeps a bounded store of reviews", () => {
    let state = {};
    for (let day = 1; day <= 40; day += 1) {
      const date = new Date(DATE.getTime() + day * 86400000);
      const iso = date.toISOString().slice(0, 10);
      state = advanceGuestReviews(state, { date, day, reservations: ids(30).map((id) => leaving(id + day * 100, { room_id: id, departure: iso })), rooms });
    }
    expect(state.guestReviews).toHaveLength(MAX_STORED_REVIEWS);
    expect(state.guestReviews[state.guestReviews.length - 1].day).toBe(40);
  });

  it("keeps the player's answers when settling", () => {
    const answered = respondToReview(bundleOf(stateWith([review(1, 1)])), "stay:1", "courteous", { day: 3 }).hotelState;
    const next = advanceGuestReviews(answered, { date: DATE, day: 4, reservations: [], rooms: [] });
    expect(next.reviewResponses["stay:1"].type).toBe("courteous");
    expect(next.guestReviews[0].applied).toBe(-0.7);
  });

  it("does not mutate its input", () => {
    const state = stateWith([review(1, 1)]);
    const snapshot = JSON.stringify(state);
    advanceGuestReviews(state, { date: DATE, day: 4, reservations, rooms });
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});
