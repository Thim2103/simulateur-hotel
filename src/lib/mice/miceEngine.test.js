import {
  MEETING_TYPES,
  OVERNIGHT_SHARE,
  CATERING_PER_PERSON_DAY,
  CATERING_COST_RATE,
  STANDARD_DISCOUNT,
  MAX_DISCOUNT,
  REQUEST_CHANCE,
  REQUEST_VALIDITY_DAYS,
  MIN_LEAD_DAYS,
  LEAD_SPAN,
  MIN_ATTENDEES,
  MAX_ATTENDEES,
  EXPECTED_DISCOUNT_MIN,
  EXPECTED_DISCOUNT_SPAN,
  isMeetingRoom,
  meetingRooms,
  maxMeetingCapacity,
  nightsOf,
  bedroomsNeeded,
  generateRequest,
  pendingRequests,
  findRequest,
  computeQuote,
  conversionChance,
  requestFeasibility,
  respondToRequest,
  advanceMice,
  miceEvents,
  lastOutcome,
  eventsOnDate,
  eventsStartingSoon,
  miceCateringRevenueOn,
  miceCateringCostOn,
  guaranteedRevenue,
  roomCalendar,
} from "./miceEngine";
import { mixedRandom } from "../clients/guestProfiles";
import { toIsoDate } from "../hotelEvents/hotelEventsEngine";

const DAY = 86400000;
const D = (text) => new Date(`${text}T12:00:00Z`);
const plus = (date, days) => new Date(date.getTime() + days * DAY);
const iso = (date) => toIsoDate(date);
const NOW = D("2026-09-14");

const room = (id, number, type, extra = {}) => ({ id, number, type, price: 100, status: "libre", capacity: 2, ...extra });
const rooms = [
  room(1, "101", "standard", { price: 120 }),
  room(2, "102", "standard", { price: 120 }),
  room(3, "103", "standard", { price: 120 }),
  room(4, "201", "deluxe", { price: 180, capacity: 3 }),
  room(5, "202", "deluxe", { price: 180, capacity: 3 }),
  room(6, "301", "suite", { price: 320, capacity: 4 }),
  room(7, "S01", "seminar", { price: 450, capacity: 20 }),
  room(8, "C01", "conference", { price: 900, capacity: 100 }),
];
const seedOnly = rooms.filter((item) => item.id !== 8);
const bundle = (extra = {}) => ({ hotelState: { finance: { revenue: [10000], costs: [0] }, ...extra }, rooms, reservations: [] });

const request = (id, extra = {}) => ({ id, company: "Novatek Solutions", attendees: 20, days: 2, startDate: iso(plus(NOW, 10)), receivedOn: iso(NOW), expiresOn: iso(plus(NOW, 7)), expectedDiscount: 0.1, status: "pending", ...extra });
const withRequest = (req, extra = {}) => bundle({ mice: { requests: [req], events: [], nextId: req.id + 1, lastOutcome: null }, ...extra });

// A request id whose decision at `discount` goes the way we want.
const signs = (req, discount) => mixedRandom(`mice-decision:${req.id}:${Math.round(discount * 100)}`) < conversionChance(req, discount);
const idWhere = (wanted, discount, extra = {}) => Array.from({ length: 4000 }, (_, i) => i + 1).find((id) => signs(request(id, extra), discount) === wanted);

describe("miceEngine / the meeting rooms", () => {
  it("seminar and conference rooms are meeting rooms, bedrooms are not", () => {
    expect(MEETING_TYPES).toEqual(["seminar", "conference"]);
    expect(rooms.filter(isMeetingRoom).map((item) => item.number)).toEqual(["S01", "C01"]);
    expect(isMeetingRoom(undefined)).toBe(false);
  });

  it("a meeting room out of service is not offered", () => {
    expect(meetingRooms([{ ...rooms[6], status: "maintenance" }, rooms[7]]).map((item) => item.number)).toEqual(["C01"]);
  });

  it("the biggest capacity", () => {
    expect(maxMeetingCapacity(rooms)).toBe(100);
    expect(maxMeetingCapacity(seedOnly)).toBe(20);
    expect(maxMeetingCapacity([rooms[0]])).toBe(0);
    expect(maxMeetingCapacity(undefined)).toBe(0);
  });
});

describe("miceEngine / what a group needs", () => {
  it("a one-day event needs no bedroom, a longer one sleeps 20 % of the group, from the second day", () => {
    expect(nightsOf(1)).toBe(0);
    expect(nightsOf(3)).toBe(2);
    expect(OVERNIGHT_SHARE).toBe(0.2);
    expect(bedroomsNeeded(50, 1)).toBe(0);
    expect(bedroomsNeeded(20, 2)).toBe(4);
    expect(bedroomsNeeded(100, 3)).toBe(20);
    expect(bedroomsNeeded(30, 2)).toBe(6);
  });
});

describe("miceEngine / the requests the calendar brings", () => {
  const generated = (roomList, days = 400) =>
    Array.from({ length: days }, (_, i) => generateRequest({ hotelState: {}, rooms: roomList, date: plus(D("2026-01-01"), i) })).filter(Boolean);

  it("none without a meeting room", () => {
    expect(generated([rooms[0], rooms[3]])).toEqual([]);
  });

  it("about one day in five brings one", () => {
    const count = generated(rooms).length;
    expect(REQUEST_CHANCE).toBe(0.18);
    expect(count).toBeGreaterThan(400 * 0.1);
    expect(count).toBeLessThan(400 * 0.28);
  });

  it("is deterministic: the same date brings the same request", () => {
    expect(generated(rooms, 60)).toEqual(generated(rooms, 60));
  });

  it("20 to 100 attendees, 1 to 3 days, starting one to three weeks ahead, valid for a week", () => {
    generated(rooms).forEach((req) => {
      expect(req.attendees).toBeGreaterThanOrEqual(MIN_ATTENDEES);
      expect(req.attendees).toBeLessThanOrEqual(MAX_ATTENDEES);
      expect(req.attendees % 10).toBe(0);
      expect([1, 2, 3]).toContain(req.days);
      const lead = (D(req.startDate) - D(req.receivedOn)) / DAY;
      expect(lead).toBeGreaterThanOrEqual(MIN_LEAD_DAYS);
      expect(lead).toBeLessThanOrEqual(MIN_LEAD_DAYS + LEAD_SPAN - 1);
      expect((D(req.expiresOn) - D(req.receivedOn)) / DAY).toBe(REQUEST_VALIDITY_DAYS);
      expect(req.expectedDiscount).toBeGreaterThanOrEqual(EXPECTED_DISCOUNT_MIN);
      expect(req.expectedDiscount).toBeLessThanOrEqual(EXPECTED_DISCOUNT_MIN + EXPECTED_DISCOUNT_SPAN);
      expect(req.status).toBe("pending");
      expect(req.company).toBeTruthy();
    });
  });

  it("the size follows the biggest meeting room, up to half again", () => {
    expect(Math.max(...generated(seedOnly).map((req) => req.attendees))).toBeLessThanOrEqual(30);
    expect(Math.max(...generated(rooms).map((req) => req.attendees))).toBeGreaterThan(60);
    expect(new Set(generated(rooms).map((req) => req.attendees)).size).toBeGreaterThan(5);
  });

  it("the ids follow the counter, and a date never brings two", () => {
    const date = plus(D("2026-01-01"), Array.from({ length: 400 }, (_, i) => i).find((i) => generateRequest({ hotelState: {}, rooms, date: plus(D("2026-01-01"), i) })));
    const first = generateRequest({ hotelState: { mice: { requests: [], events: [], nextId: 7 } }, rooms, date });
    expect(first.id).toBe(7);
    expect(generateRequest({ hotelState: { mice: { requests: [first], events: [], nextId: 8 } }, rooms, date })).toBeNull();
  });
});

describe("miceEngine / quotes", () => {
  const req = request(1, { attendees: 20, days: 2 });

  it("prices the meeting room per day, the catering per person per day and the bedrooms per night", () => {
    const quote = computeQuote({ request: req, rooms });
    expect(quote.meeting).toBe(450 * 2);
    expect(quote.catering).toBe(20 * CATERING_PER_PERSON_DAY * 2);
    expect(quote.lines).toMatchObject({ meetingRoom: "S01", days: 2, attendees: 20, bedrooms: 4, nights: 1 });
    expect(quote.accommodation).toBeGreaterThan(0);
    expect(quote.total).toBe(quote.rack);
    expect(quote.rack).toBe(quote.meeting + quote.catering + quote.accommodation);
  });

  it("uses the smallest room that is big enough, and the chosen bedrooms' own prices", () => {
    const big = computeQuote({ request: request(2, { attendees: 60, days: 1 }), rooms });
    expect(big.lines.meetingRoom).toBe("C01");
    expect(big.meeting).toBe(900);
    const exact = computeQuote({ request: req, rooms, meetingRoom: rooms[6], bedrooms: [rooms[0], rooms[1], rooms[3], rooms[4]] });
    expect(exact.accommodation).toBe((120 + 120 + 180 + 180) * 1);
  });

  it("a one-day event has no accommodation", () => {
    expect(computeQuote({ request: request(3, { days: 1 }), rooms }).accommodation).toBe(0);
  });

  it("the group discount applies to the whole package, up to 30 %", () => {
    const quote = computeQuote({ request: req, rooms, discount: 0.1 });
    expect(quote.discount).toBe(0.1);
    expect(quote.total).toBeLessThan(quote.rack);
    expect(quote.total).toBeCloseTo(quote.rack * 0.9, -1);
    expect(computeQuote({ request: req, rooms, discount: 0.9 }).discount).toBe(MAX_DISCOUNT);
    expect(computeQuote({ request: req, rooms, discount: -1 }).discount).toBe(0);
  });

  it("a bigger group is worth more", () => {
    expect(computeQuote({ request: request(4, { attendees: 100, days: 3 }), rooms }).total).toBeGreaterThan(computeQuote({ request: req, rooms }).total);
  });
});

describe("miceEngine / the chance the client signs", () => {
  const req = request(1, { expectedDiscount: 0.12 });

  it("is 70 % at the discount the client expects", () => {
    expect(conversionChance(req, 0.12)).toBeCloseTo(0.7);
  });

  it("rises with a bigger discount, up to 95 %", () => {
    expect(conversionChance(req, 0.16)).toBeCloseTo(0.8);
    expect(conversionChance(req, 0.3)).toBe(0.95);
  });

  it("falls fast with a smaller one, down to 5 %", () => {
    expect(conversionChance(req, 0.1)).toBeCloseTo(0.6);
    expect(conversionChance(req, 0.02)).toBeCloseTo(0.2);
    expect(conversionChance(req, 0)).toBeCloseTo(0.1);
    expect(conversionChance(request(2, { expectedDiscount: 0.2 }), 0)).toBe(0.05);
  });

  it("never decreases when the discount goes up", () => {
    let last = 0;
    for (let d = 0; d <= 0.3; d += 0.01) {
      expect(conversionChance(req, d)).toBeGreaterThanOrEqual(last);
      last = conversionChance(req, d);
    }
  });

  it("the standard group rate is 10 %", () => {
    expect(STANDARD_DISCOUNT).toBe(0.1);
  });
});

describe("miceEngine / can the hotel host it?", () => {
  it("yes: the smallest big-enough free meeting room and the bedrooms, with about 30 % deluxe", () => {
    const result = requestFeasibility({ request: request(1, { attendees: 20, days: 2 }), rooms, reservations: [] });
    expect(result).toMatchObject({ ok: true, reason: "" });
    expect(result.meetingRoom.number).toBe("S01");
    expect(result.bedrooms).toHaveLength(4);
    expect(result.bedrooms.filter((item) => item.type === "deluxe")).toHaveLength(1);
    expect(requestFeasibility({ request: request(1, { attendees: 30, days: 1 }), rooms, reservations: [] }).meetingRoom.number).toBe("C01");
  });

  it("a one-day event needs no bedroom", () => {
    expect(requestFeasibility({ request: request(1, { attendees: 20, days: 1 }), rooms, reservations: [] })).toMatchObject({ ok: true, bedrooms: [] });
  });

  it("no meeting room, or none big enough, says so", () => {
    expect(requestFeasibility({ request: request(1), rooms: [rooms[0]], reservations: [] }).reason).toMatch(/aucune salle de réunion/i);
    const tooSmall = requestFeasibility({ request: request(1, { attendees: 60 }), rooms: seedOnly, reservations: [] });
    expect(tooSmall.ok).toBe(false);
    expect(tooSmall.reason).toMatch(/aucune salle assez grande.*20 personnes/i);
  });

  it("a meeting room already taken over the dates is not free", () => {
    const busy = [{ id: 50, room_id: 7, status: "confirmée", arrival: iso(plus(NOW, 9)), departure: iso(plus(NOW, 11)) }];
    expect(requestFeasibility({ request: request(1, { attendees: 20, days: 2 }), rooms: seedOnly, reservations: busy })).toMatchObject({ ok: false, reason: expect.stringMatching(/déjà prise/i) });
    expect(requestFeasibility({ request: request(1, { attendees: 20, days: 2 }), rooms, reservations: busy }).meetingRoom.number).toBe("C01");
  });

  it("not enough free bedrooms for the sleepers says how many are free", () => {
    const tiny = [rooms[0], rooms[3], rooms[6]];
    const result = requestFeasibility({ request: request(1, { attendees: 20, days: 2 }), rooms: tiny, reservations: [] });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/seulement 2 chambre\(s\) libre\(s\) pour les 4 nécessaires/i);
  });

  it("bedrooms booked for those nights don't count", () => {
    const taken = [1, 2, 3].map((id) => ({ id: 60 + id, room_id: id, status: "confirmée", arrival: iso(plus(NOW, 9)), departure: iso(plus(NOW, 12)) }));
    const result = requestFeasibility({ request: request(1, { attendees: 20, days: 2 }), rooms, reservations: taken });
    expect(result.ok).toBe(false);
  });

  it("a cancelled stay does not block", () => {
    const cancelled = [1, 2, 3].map((id) => ({ id: 60 + id, room_id: id, status: "annulée", arrival: iso(plus(NOW, 9)), departure: iso(plus(NOW, 12)) }));
    expect(requestFeasibility({ request: request(1, { attendees: 20, days: 2 }), rooms, reservations: cancelled }).ok).toBe(true);
  });
});

describe("miceEngine / answering a quote", () => {
  const SIGN_ID = idWhere(true, STANDARD_DISCOUNT);
  const LOSE_ID = idWhere(false, STANDARD_DISCOUNT);

  it("declining closes the quote at no cost", () => {
    const start = withRequest(request(1));
    const next = respondToRequest(start, 1, { type: "decline" }, { day: 3, date: NOW });
    expect(findRequest(next.hotelState, 1).status).toBe("declined");
    expect(next.reservations).toEqual([]);
    expect(lastOutcome(next.hotelState)).toMatchObject({ requestId: 1, outcome: "declined" });
    expect(pendingRequests(next.hotelState, NOW)).toEqual([]);
  });

  it("accepting at the standard rate can sign the group: the rooms are booked at once, as reservations", () => {
    const req = request(SIGN_ID, { attendees: 20, days: 2 });
    const next = respondToRequest(withRequest(req), SIGN_ID, { type: "accept" }, { day: 3, date: NOW });
    expect(findRequest(next.hotelState, SIGN_ID).status).toBe("accepted");
    const meeting = next.reservations.filter((item) => item.source === "mice-meeting");
    const beds = next.reservations.filter((item) => item.source === "mice");
    expect(meeting).toHaveLength(1);
    expect(beds).toHaveLength(4);
    expect(meeting[0]).toMatchObject({ room_id: 7, status: "confirmée", arrival: req.startDate, departure: iso(plus(D(req.startDate), 2)), segment: "business", price: Math.round(450 * 0.9) });
    beds.forEach((bed) => expect(bed).toMatchObject({ status: "confirmée", arrival: req.startDate, departure: iso(plus(D(req.startDate), 1)), segment: "business" }));
    expect(beds[0].client_name).toMatch(/Novatek Solutions \(séminaire\)/);
    expect(new Set(next.reservations.map((item) => item.id)).size).toBe(next.reservations.length);
  });

  it("records the event with its dates, quote and rooms, and says what happened", () => {
    const req = request(SIGN_ID, { attendees: 20, days: 2 });
    const next = respondToRequest(withRequest(req), SIGN_ID, { type: "accept" }, { day: 3, date: NOW });
    const [event] = miceEvents(next.hotelState);
    expect(event).toMatchObject({ requestId: SIGN_ID, company: "Novatek Solutions", attendees: 20, days: 2, startDate: req.startDate, endDate: iso(plus(D(req.startDate), 1)), status: "confirmed", discount: 0.1, meetingRoomNumber: "S01" });
    expect(event.bedroomIds).toHaveLength(4);
    expect(event.quote.total).toBeGreaterThan(0);
    expect(event.cateringPerDay).toBe(Math.round(event.quote.catering / 2));
    expect(lastOutcome(next.hotelState)).toMatchObject({ requestId: SIGN_ID, outcome: "signed", total: event.quote.total });
  });

  it("the guaranteed revenue is the quote's total", () => {
    const req = request(SIGN_ID, { attendees: 20, days: 2 });
    const next = respondToRequest(withRequest(req), SIGN_ID, { type: "accept" }, { day: 3, date: NOW });
    expect(guaranteedRevenue(next.hotelState, NOW)).toBe(miceEvents(next.hotelState)[0].quote.total);
    expect(guaranteedRevenue({}, NOW)).toBe(0);
  });

  it("or the client walks away: nothing is booked and the quote is lost", () => {
    const req = request(LOSE_ID);
    const next = respondToRequest(withRequest(req), LOSE_ID, { type: "accept" }, { day: 3, date: NOW });
    expect(findRequest(next.hotelState, LOSE_ID).status).toBe("lost");
    expect(next.reservations).toEqual([]);
    expect(miceEvents(next.hotelState)).toEqual([]);
    expect(lastOutcome(next.hotelState)).toMatchObject({ outcome: "lost" });
  });

  it("negotiating a bigger discount converts more often than a stingy one", () => {
    const rate = (discount) => Array.from({ length: 400 }, (_, i) => i + 1).filter((id) => signs(request(id, { expectedDiscount: 0.14 }), discount)).length;
    expect(rate(0.3)).toBeGreaterThan(rate(0.14));
    expect(rate(0.14)).toBeGreaterThan(rate(0.05));
    expect(rate(0)).toBeLessThan(400 * 0.25);
    expect(rate(0.3)).toBeGreaterThan(400 * 0.85);
  });

  it("the negotiated discount is what the rooms are sold at, capped at 30 %", () => {
    const id = idWhere(true, 0.3);
    const req = request(id, { attendees: 20, days: 2 });
    const next = respondToRequest(withRequest(req), id, { type: "negotiate", discount: 0.5 }, { day: 3, date: NOW });
    expect(miceEvents(next.hotelState)[0].discount).toBe(0.3);
    expect(next.reservations.find((item) => item.source === "mice-meeting").price).toBe(Math.round(450 * 0.7));
  });

  it("the same answer always gives the same outcome", () => {
    const req = request(SIGN_ID, { attendees: 20, days: 2 });
    expect(respondToRequest(withRequest(req), SIGN_ID, { type: "accept" }, { day: 3, date: NOW })).toEqual(respondToRequest(withRequest(req), SIGN_ID, { type: "accept" }, { day: 3, date: NOW }));
  });

  it("is refused, changing nothing, when the hotel can't host the group", () => {
    const req = request(SIGN_ID, { attendees: 100, days: 1 });
    const start = { ...withRequest(req), rooms: seedOnly };
    expect(respondToRequest(start, SIGN_ID, { type: "accept" }, { day: 3, date: NOW })).toBe(start);
  });

  it("can't answer a quote that isn't pending, has expired or has started", () => {
    const answered = respondToRequest(withRequest(request(1)), 1, { type: "decline" }, { day: 3, date: NOW });
    expect(respondToRequest(answered, 1, { type: "accept" }, { day: 3, date: NOW })).toBe(answered);
    const start = withRequest(request(1));
    expect(respondToRequest(start, 1, { type: "accept" }, { day: 3, date: plus(NOW, 8) })).toBe(start);
    expect(respondToRequest(start, 99, { type: "accept" }, { day: 3, date: NOW })).toBe(start);
    expect(respondToRequest(start, 1, { type: "haggle" }, { day: 3, date: NOW })).toBe(start);
  });

  it("the booked rooms can't be sold twice: a second event at the same dates finds them taken", () => {
    const req = request(SIGN_ID, { attendees: 20, days: 2 });
    const first = respondToRequest(withRequest(req), SIGN_ID, { type: "accept" }, { day: 3, date: NOW });
    const other = request(9000, { attendees: 20, days: 2 });
    const state = { ...first, hotelState: { ...first.hotelState, mice: { ...first.hotelState.mice, requests: [...first.hotelState.mice.requests, other] } }, rooms: seedOnly };
    expect(requestFeasibility({ request: other, rooms: seedOnly, reservations: state.reservations }).ok).toBe(false);
  });

  it("does not mutate its input", () => {
    const start = withRequest(request(SIGN_ID, { attendees: 20, days: 2 }));
    const snapshot = JSON.stringify(start);
    respondToRequest(start, SIGN_ID, { type: "accept" }, { day: 3, date: NOW });
    respondToRequest(start, SIGN_ID, { type: "decline" }, { day: 3, date: NOW });
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});

describe("miceEngine / the days go by", () => {
  const requestDay = Array.from({ length: 400 }, (_, i) => plus(D("2026-01-01"), i)).find((date) => generateRequest({ hotelState: {}, rooms, date }));

  it("a day with a request adds it to the pending ones", () => {
    const next = advanceMice({}, { date: requestDay, rooms });
    expect(pendingRequests(next, requestDay)).toHaveLength(1);
    expect(next.mice.nextId).toBe(2);
  });

  it("a hotel with no meeting room, or on an ordinary day, is left untouched", () => {
    const quiet = Array.from({ length: 400 }, (_, i) => plus(D("2026-01-01"), i)).find((date) => !generateRequest({ hotelState: {}, rooms, date }));
    const state = { finance: {} };
    expect(advanceMice(state, { date: quiet, rooms })).toBe(state);
    expect(advanceMice(state, { date: requestDay, rooms: [rooms[0]] })).toBe(state);
  });

  it("an unanswered quote expires after a week, and one whose start date has come too", () => {
    const start = withRequest(request(1, { expiresOn: iso(plus(NOW, 7)) }));
    const week = advanceMice(start.hotelState, { date: plus(NOW, 8), rooms: [rooms[0]] });
    expect(findRequest(week, 1).status).toBe("expired");
    expect(pendingRequests(week, plus(NOW, 8))).toEqual([]);
    const late = advanceMice(withRequest(request(2, { startDate: iso(plus(NOW, 3)), expiresOn: iso(plus(NOW, 30)) })).hotelState, { date: plus(NOW, 3), rooms: [rooms[0]] });
    expect(findRequest(late, 2).status).toBe("expired");
  });

  it("a quote answered in time is not expired", () => {
    const answered = respondToRequest(withRequest(request(SIGN_ID_FOR_ADVANCE(), { attendees: 20, days: 2 })), SIGN_ID_FOR_ADVANCE(), { type: "decline" }, { day: 3, date: NOW });
    expect(findRequest(advanceMice(answered.hotelState, { date: plus(NOW, 8), rooms }), SIGN_ID_FOR_ADVANCE()).status).toBe("declined");
  });

  it("an event is done once its last day is over", () => {
    const id = idWhere(true, STANDARD_DISCOUNT);
    const signed = respondToRequest(withRequest(request(id, { attendees: 20, days: 2 })), id, { type: "accept" }, { day: 3, date: NOW });
    const [event] = miceEvents(signed.hotelState);
    const during = advanceMice(signed.hotelState, { date: D(event.startDate), rooms: [rooms[0]] });
    expect(miceEvents(during)[0].status).toBe("confirmed");
    const after = advanceMice(signed.hotelState, { date: D(event.endDate), rooms: [rooms[0]] });
    expect(miceEvents(after)[0]).toMatchObject({ status: "done", completedOn: event.endDate });
    expect(guaranteedRevenue(after, D(event.endDate))).toBe(0);
  });

  it("keeps a bounded history", () => {
    const many = { requests: Array.from({ length: 60 }, (_, i) => request(i + 1, { status: "declined", closedOn: "2026-01-01" })), events: [], nextId: 61, lastOutcome: null };
    const next = advanceMice({ mice: many }, { date: NOW, rooms });
    expect(next.mice.requests.filter((item) => item.status !== "pending").length).toBeLessThanOrEqual(20);
  });
});

function SIGN_ID_FOR_ADVANCE() {
  return 77;
}

describe("miceEngine / reading the events", () => {
  const id = idWhere(true, STANDARD_DISCOUNT);
  const signed = respondToRequest(withRequest(request(id, { attendees: 20, days: 2 })), id, { type: "accept" }, { day: 3, date: NOW });
  const [event] = miceEvents(signed.hotelState);
  const first = D(event.startDate);
  const last = D(event.endDate);

  it("finds the events holding on a date", () => {
    expect(eventsOnDate(signed.hotelState, first)).toHaveLength(1);
    expect(eventsOnDate(signed.hotelState, last)).toHaveLength(1);
    expect(eventsOnDate(signed.hotelState, plus(last, 1))).toEqual([]);
    expect(eventsOnDate(signed.hotelState, plus(first, -1))).toEqual([]);
  });

  it("announces the ones starting soon", () => {
    expect(eventsStartingSoon(signed.hotelState, plus(first, -2), 3)).toHaveLength(1);
    expect(eventsStartingSoon(signed.hotelState, plus(first, -5), 3)).toEqual([]);
    expect(eventsStartingSoon(signed.hotelState, first, 3)).toEqual([]);
  });

  it("catering brings restaurant revenue on each event day, less its food cost", () => {
    expect(miceCateringRevenueOn(signed.hotelState, first)).toBe(event.cateringPerDay);
    expect(miceCateringRevenueOn(signed.hotelState, last)).toBe(event.cateringPerDay);
    expect(miceCateringRevenueOn(signed.hotelState, plus(last, 1))).toBe(0);
    expect(miceCateringCostOn(signed.hotelState, first)).toBe(Math.round(event.cateringPerDay * CATERING_COST_RATE));
    expect(miceCateringRevenueOn({}, first)).toBe(0);
  });

  it("shows each meeting room's next days: which are taken by an event", () => {
    const calendar = roomCalendar({ hotelState: signed.hotelState, rooms, reservations: signed.reservations, date: NOW, days: 20 });
    expect(calendar.map((item) => item.number)).toEqual(["S01", "C01"]);
    const s01 = calendar[0];
    expect(s01.capacity).toBe(20);
    expect(s01.days).toHaveLength(20);
    expect(s01.days.filter((day) => day.busy === event.id).map((day) => day.date)).toEqual([event.startDate, event.endDate]);
    expect(calendar[1].days.every((day) => day.busy === null)).toBe(true);
  });

  it("a booking that isn't a MICE event shows as 'other'", () => {
    const other = [{ id: 1, room_id: 8, status: "confirmée", arrival: iso(plus(NOW, 2)), departure: iso(plus(NOW, 3)) }];
    const calendar = roomCalendar({ hotelState: {}, rooms, reservations: other, date: NOW, days: 5 });
    expect(calendar[1].days.map((day) => day.busy)).toEqual([null, null, "other", null, null]);
  });
});
