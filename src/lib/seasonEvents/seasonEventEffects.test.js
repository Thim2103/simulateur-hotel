import { computeDemand, generateBookings, applyDemand, MAX_MULTIPLIER } from "../demand/demandEngine";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { reviewsForDepartures } from "../clients/guestReviewEngine";
import { vipSatisfaction } from "../clients/vipServiceEngine";
import { generateRequest, REQUEST_CHANCE } from "../mice/miceEngine";
import { eventsOn } from "../hotelEvents/hotelEventsEngine";
import { seasonOfYear, MICE_REQUEST_FACTOR } from "./seasonEventEngine";

const DAY = 86400000;
const D = (text) => new Date(`${text}T12:00:00Z`);
const plus = (date, days) => new Date(date.getTime() + days * DAY);
const iso = (date) => date.toISOString().slice(0, 10);

function findDate(predicate, from = D("2026-01-01"), span = 900) {
  for (let i = 0; i < span; i += 1) {
    const date = plus(from, i);
    if (predicate(date)) return date;
  }
  throw new Error("no such date");
}
const firstDayOf = (id) => findDate((date) => eventsOn(date).some((event) => event.id === id && event.dayNumber === 1));
const onlyEvent = (id) => (date) => eventsOn(date).length === 1 && eventsOn(date)[0].id === id;

const rooms = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, number: String(100 + i), type: "standard", status: "libre", price: 120, capacity: 2 }));
const hotel = { progression: { player: { reputation: 60 } } };
const demand = (referenceDate, hotelState = hotel) => computeDemand({ hotelState, rooms, reservations: [], referenceDate });

describe("seasonEvents / demand", () => {
  it("a grand festival day multiplies the events factor by 1.8", () => {
    const date = findDate(onlyEvent("music-festival"));
    expect(demand(date).factors.events).toBeCloseTo(1.8, 10);
  });

  it("an international fair does too", () => {
    const date = findDate(onlyEvent("international-fair"));
    expect(demand(date).factors.events).toBeCloseTo(1.8, 10);
  });

  it("roadworks do not move demand", () => {
    const date = findDate(onlyEvent("roadworks"));
    expect(demand(date).factors.events).toBe(1);
  });

  it("the +80 % is still felt in high season: the multiplier goes past the old ceiling", () => {
    const date = findDate((day) => onlyEvent("music-festival")(day) && seasonOfYear(day) === "summer");
    const { multiplier } = demand(date);
    expect(MAX_MULTIPLIER).toBeGreaterThan(1.8);
    expect(multiplier).toBeGreaterThan(1.8);
    expect(multiplier).toBeLessThanOrEqual(MAX_MULTIPLIER);
  });

  it("guests accept higher prices during the festival: the price factor is less punishing", () => {
    const festival = findDate(onlyEvent("music-festival"));
    const plainSummer = findDate((day) => seasonOfYear(day) === "summer" && eventsOn(day).length === 0);
    const dear = [{ id: 1, room_id: 1, status: "confirmée", price: 156, departure: "2027-12-31" }]; // 30 % above the base rate
    const priceFactor = (date) => computeDemand({ hotelState: hotel, rooms, reservations: dear, referenceDate: date }).factors.price;
    expect(priceFactor(festival)).toBeGreaterThan(priceFactor(plainSummer));
  });

  it("brings a professional share of 50 % in spring and autumn, none by the calendar in summer and winter", () => {
    expect(demand(D("2026-04-15")).proShare).toBe(0.5);
    expect(demand(D("2026-10-14")).proShare).toBe(0.5);
    expect(demand(D("2026-07-15")).proShare).toBe(0);
    expect(demand(D("2027-01-13")).proShare).toBe(0);
  });
});

describe("seasonEvents / the professional clientele", () => {
  const book = (extra) => generateBookings({ rooms, reservations: [], referenceDate: D("2026-04-15"), multiplier: 3, ...extra });
  const share = (result) => result.reservations.filter((reservation) => reservation.segment === "business").length / result.reservations.length;

  it("half of the bookings are business guests when the calendar asks for it", () => {
    const result = book({ proShare: 0.5 });
    expect(result.reservations.length).toBeGreaterThan(4);
    expect(share(result)).toBeGreaterThanOrEqual(0.5);
  });

  it("more than without it", () => {
    expect(share(book({ proShare: 0.5 }))).toBeGreaterThan(share(book({ proShare: 0 })));
  });

  it("a targeted campaign's bias still wins over the calendar's", () => {
    const result = book({ proShare: 0.5, segmentBias: "leisure" });
    const business = result.reservations.filter((reservation) => reservation.segment === "business").length;
    expect(business).toBeLessThanOrEqual(Math.ceil(result.reservations.length / 3));
  });

  it("the daily demand passes the share on to the bookings it creates", () => {
    const spring = applyDemand({ hotelState: hotel, rooms, reservations: [], referenceDate: D("2026-04-15") });
    const summer = applyDemand({ hotelState: hotel, rooms, reservations: [], referenceDate: D("2026-07-15") });
    const businessShare = (result) => result.reservations.filter((reservation) => reservation.segment === "business").length / Math.max(1, result.reservations.length);
    expect(businessShare(spring)).toBeGreaterThan(businessShare(summer));
    expect(businessShare(spring)).toBeGreaterThanOrEqual(0.5);
  });

  it("companies write for seminars half as often again in spring and autumn", () => {
    const withMeetingRoom = [...rooms, { id: 99, number: "S01", type: "seminar", status: "libre", price: 450, capacity: 20 }];
    const counts = { pro: 0, other: 0 };
    const days = { pro: 0, other: 0 };
    for (let i = 0; i < 730; i += 1) {
      const date = plus(D("2026-01-01"), i);
      const kind = seasonOfYear(date) === "spring" || seasonOfYear(date) === "autumn" ? "pro" : "other";
      days[kind] += 1;
      if (generateRequest({ hotelState: {}, rooms: withMeetingRoom, date })) counts[kind] += 1;
    }
    const proRate = counts.pro / days.pro;
    const otherRate = counts.other / days.other;
    expect(otherRate).toBeGreaterThan(REQUEST_CHANCE * 0.7);
    expect(otherRate).toBeLessThan(REQUEST_CHANCE * 1.3);
    expect(proRate / otherRate).toBeGreaterThan(MICE_REQUEST_FACTOR * 0.75);
    expect(proRate / otherRate).toBeLessThan(MICE_REQUEST_FACTOR * 1.3);
  });
});

describe("seasonEvents / roadworks and satisfaction", () => {
  const stayAt = (id, departure) => ({ id, room_id: 1, room: "101", room_type: "standard", client_name: `Client ${id}`, arrival: iso(plus(departure, -2)), departure: iso(departure), status: "confirmée", segment: "leisure", price: 120 });
  const ratings = (departure) => {
    // A day's reviews are capped at five: read many small cohorts of departures.
    const found = new Map();
    for (let block = 0; block < 80; block += 1) {
      const reservations = Array.from({ length: 25 }, (_, i) => stayAt(block * 25 + i + 1, departure));
      reviewsForDepartures({ hotelState: {}, reservations, rooms, date: iso(departure), day: 5 }).forEach((review) => found.set(review.id, review.rating));
    }
    return found;
  };
  const works = plus(firstDayOf("roadworks"), 2); // a departure in the middle of the works
  const quiet = D("2027-01-15"); // no roadworks in January

  it("guests who stayed through roadworks rate their stay lower, never higher", () => {
    const during = ratings(works);
    const calm = ratings(quiet);
    expect(during.size).toBeGreaterThan(30);
    during.forEach((rating, id) => {
      if (calm.has(id)) expect(rating).toBeLessThanOrEqual(calm.get(id));
    });
  });

  it("and a fair number of them drop a full star (5 points is a quarter of a star)", () => {
    const during = ratings(works);
    const calm = ratings(quiet);
    let lower = 0;
    let shared = 0;
    during.forEach((rating, id) => {
      if (!calm.has(id)) return;
      shared += 1;
      if (rating < calm.get(id)) lower += 1;
    });
    expect(shared).toBeGreaterThan(30);
    expect(lower).toBeGreaterThan(0);
    expect(lower / shared).toBeLessThan(0.6);
  });

  it("a V.I.P.'s gauge shows a line for the works, −5 points", () => {
    const during = vipSatisfaction({ reservation: stayAt(1, works), hotelState: {} });
    const calm = vipSatisfaction({ reservation: stayAt(1, quiet), hotelState: {} });
    expect(during.lines.find((line) => line.key === "roadworks")).toMatchObject({ label: "Travaux devant l'hôtel", value: -5 });
    expect(calm.lines.find((line) => line.key === "roadworks")).toBeUndefined();
    expect(calm.score - during.score).toBe(5);
  });
});

describe("seasonEvents / through the career day", () => {
  const start = firstDayOf("music-festival");
  const career = () =>
    startCareer({
      playerId: "p",
      startDate: iso(start),
      hotelState: { finance: { revenue: [100000], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {} },
      restaurantState: {
        finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
        menu: [{ price: 20, cost: 8, sales: 10 }],
        staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
        operations: [],
        marketing: { budget: 0 },
        esg: {},
      },
      rooms,
      reservations: [],
    });

  it("the first day of a festival is played at its +80 % demand", async () => {
    const { state } = await runCareerDay({ state: career(), rng: () => 0.999 });
    expect(state.lastDayReport.demandReport.factors.events).toBeGreaterThanOrEqual(1.8 - 1e-9);
  });
});
