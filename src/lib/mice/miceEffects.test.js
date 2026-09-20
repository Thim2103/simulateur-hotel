import { generateBookings } from "../demand/demandEngine";
import { projectedOccupancy } from "../rm/yieldManagementEngine";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildDailyReview } from "../dashboard/dailyReview";
import { reviewsForDepartures } from "../clients/guestReviewEngine";
import { vipGuestsInHouse } from "../clients/guestProfiles";
import { buildHotelSceneEntities } from "../../ui/hotelView/engine/EntityFactory";
import { startFloorConstruction, advanceExpansion, fitOutRooms, CONSTRUCTION_DAYS, ROOM_KINDS } from "../expansion/hotelExpansionEngine";
import { computeDailyMaintenance } from "../maintenance/maintenanceCostEngine";
import { conversionChance, respondToRequest, advanceMice, pendingRequests, miceEvents, maxMeetingCapacity, generateRequest, STANDARD_DISCOUNT, CATERING_COST_RATE } from "./miceEngine";
import { describeMiceDay } from "./miceReport";
import { mixedRandom } from "../clients/guestProfiles";
import { toIsoDate } from "../hotelEvents/hotelEventsEngine";

const DAY = 86400000;
const D = (text) => new Date(`${text}T12:00:00Z`);
const plus = (date, days) => new Date(date.getTime() + days * DAY);
const iso = (date) => toIsoDate(date);
const START = D("2026-09-14");

const bedrooms = [1, 2, 3, 4].map((id) => ({ id, number: `10${id}`, type: id < 3 ? "standard" : "deluxe", price: 120, status: "libre", capacity: 2, housekeeping_status: "clean" }));
const seminar = { id: 9, number: "S01", type: "seminar", price: 450, status: "libre", capacity: 20, floor: 0, housekeeping_status: "clean" };
const allRooms = [...bedrooms, seminar];

describe("mice / meeting rooms are not bedrooms for the general demand", () => {
  const book = (rooms) => generateBookings({ rooms, reservations: [], referenceDate: START, multiplier: 3 });

  it("ordinary bookings never take the meeting room", () => {
    const result = book(allRooms);
    expect(result.reservations.length).toBeGreaterThan(0);
    expect(result.reservations.every((reservation) => reservation.room_id !== 9)).toBe(true);
  });

  it("nor does it add to the number of bookings", () => {
    expect(book(allRooms).created).toBe(book(bedrooms).created);
  });

  it("nor to the occupancy denominator the yield rules read", () => {
    const one = [{ id: 1, room_id: 1, status: "confirmée", arrival: iso(START), departure: iso(plus(START, 1)) }];
    expect(projectedOccupancy(allRooms, one, START)).toBe(projectedOccupancy(bedrooms, one, START));
  });
});

describe("mice / the scene and the expansion", () => {
  it("a meeting room carries a meeting flag on the schematic scene, bedrooms don't", () => {
    const entities = buildHotelSceneEntities({ rooms: allRooms, staffCount: 0, diagnostics: [] }).filter((entity) => entity.type === "room");
    expect(entities.find((entity) => entity.metadata.number === "S01").metadata.meeting).toBe(true);
    expect(entities.find((entity) => entity.metadata.number === "101").metadata).not.toHaveProperty("meeting");
  });

  it("the expansion can fit out seminar and conference rooms, with their own capacity", () => {
    expect(ROOM_KINDS.seminar).toMatchObject({ capacity: 40 });
    expect(ROOM_KINDS.conference).toMatchObject({ capacity: 100 });
    let bundle = startFloorConstruction({ hotelState: { expansion: { availableCapital: 900000 } }, rooms: allRooms }, { day: 0 });
    bundle = { ...bundle, hotelState: advanceExpansion(bundle.hotelState, CONSTRUCTION_DAYS) };
    expect(maxMeetingCapacity(bundle.rooms)).toBe(20);
    bundle = fitOutRooms(bundle, 5, "conference");
    expect(bundle.rooms[bundle.rooms.length - 1]).toMatchObject({ type: "conference", capacity: 100, floor: 5 });
    expect(maxMeetingCapacity(bundle.rooms)).toBe(100);
  });

  it("a meeting room costs its own daily upkeep", () => {
    expect(computeDailyMaintenance({ hotelState: {}, rooms: [seminar] }).rooms).toBe(15);
  });
});

describe("mice / guests and V.I.P.s", () => {
  const date = D("2026-09-15");
  const meeting = { id: 1, room_id: 9, client_name: "Novatek (séminaire)", arrival: "2026-09-14", departure: "2026-09-16", status: "confirmée", source: "mice-meeting", segment: "business", price: 400 };

  it("the meeting room's booking is not a guest: no review when it ends", () => {
    const rooms = allRooms;
    const ends = { ...meeting, departure: "2026-09-15" };
    expect(reviewsForDepartures({ hotelState: {}, reservations: [ends], rooms, date, day: 5 })).toEqual([]);
  });

  it("nor a V.I.P. in the house, however many ids we try", () => {
    const reservations = Array.from({ length: 300 }, (_, i) => ({ ...meeting, id: i + 1 }));
    expect(vipGuestsInHouse({ reservations, rooms: allRooms, date })).toEqual([]);
  });

  it("but the attendees sleeping over are guests like any other", () => {
    const beds = Array.from({ length: 40 }, (_, i) => ({ id: 100 + i, room_id: 1, client_name: `Novatek ${i}`, arrival: "2026-09-14", departure: "2026-09-15", status: "confirmée", source: "mice", segment: "business", price: 100 }));
    const written = beds.flatMap((bed) => reviewsForDepartures({ hotelState: {}, reservations: [bed], rooms: allRooms, date, day: 5 }));
    expect(written.length).toBeGreaterThan(5);
    expect(written.every((review) => review.profile !== "family")).toBe(true);
  });
});

describe("mice / through the career day", () => {
  function career(rooms = allRooms, startDate = iso(START)) {
    return startCareer({
      playerId: "p",
      startDate,
      hotelState: { finance: { revenue: [100000], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {}, expansion: { availableCapital: 100000 } },
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
  }
  const play = async (state, days) => {
    let current = state;
    for (let i = 0; i < days; i += 1) ({ state: current } = await runCareerDay({ state: current, rng: () => 0.999 }));
    return current;
  };
  const dashboard = { kpis: { revenueToday: 0, profit: 0, satisfaction: 3, staffMorale: 50, occupancyRate: 0, date: "d" } };

  // A confirmed event held on the first day played, with the given catering.
  const withEvent = (state, { cateringPerDay = 1000, startDate = iso(START), days = 1 } = {}) => ({
    ...state,
    hotel: {
      ...state.hotel,
      hotelState: {
        ...state.hotel.hotelState,
        mice: {
          requests: [],
          events: [{ id: 1, requestId: 1, company: "Novatek Solutions", attendees: 20, days, startDate, endDate: iso(plus(D(startDate), days - 1)), status: "confirmed", discount: 0.1, quote: { total: 5000, catering: cateringPerDay * days }, meetingRoomId: 9, meetingRoomNumber: "S01", bedroomIds: [], cateringPerDay }],
          nextId: 2,
          lastOutcome: null,
        },
      },
    },
  });

  it("the catering of an event day is a peak of restaurant revenue", async () => {
    const plain = await runCareerDay({ state: career(), rng: () => 0.999 });
    const seminarDay = await runCareerDay({ state: withEvent(career()), rng: () => 0.999 });
    expect(seminarDay.report.dailyReport.restaurantRevenue.miceCatering).toBe(1000);
    expect(seminarDay.report.dailyReport.restaurantRevenue.netRevenue - plain.report.dailyReport.restaurantRevenue.netRevenue).toBe(1000);
    expect(plain.report.dailyReport.restaurantRevenue).not.toHaveProperty("miceCatering");
  });

  it("it counts in the day's profit, less its food cost", async () => {
    const plain = await runCareerDay({ state: career(), rng: () => 0.999 });
    const seminarDay = await runCareerDay({ state: withEvent(career()), rng: () => 0.999 });
    const cost = Math.round(1000 * CATERING_COST_RATE);
    expect(seminarDay.report.dailyReport.expenses.variable - plain.report.dailyReport.expenses.variable).toBe(cost);
    expect(seminarDay.report.dailyReport.profit - plain.report.dailyReport.profit).toBeGreaterThanOrEqual(1000 - cost - 1);
    expect(seminarDay.report.dailyReport.profit - plain.report.dailyReport.profit).toBeLessThanOrEqual(1000 - cost + 1);
  });

  it("no catering on the days after the event", async () => {
    const state = await play(withEvent(career()), 1);
    const next = await runCareerDay({ state, rng: () => 0.999 });
    expect(next.report.dailyReport.restaurantRevenue).not.toHaveProperty("miceCatering");
  });

  it("a hotel with a meeting room eventually gets quotes; one without never does", async () => {
    const state = await play(career(), 40);
    expect(state.hotel.hotelState.mice.requests.length).toBeGreaterThan(0);
    const without = await play(career(bedrooms), 40);
    expect(without.hotel.hotelState.mice).toBeUndefined();
  });

  it("a signed event books the rooms; the rooms earn revenue on the event days and the event is closed after", async () => {
    let state = career();
    // The first quote the calendar brings, at the hotel's size.
    let request = null;
    for (let i = 0; i < 40 && !request; i += 1) {
      state = await play(state, 1);
      request = pendingRequests(state.hotel.hotelState, D(iso(plus(START, state.day)))).find((item) => item.attendees <= 20 && item.days <= 2) || null;
    }
    expect(request).not.toBeNull();
    const date = D(iso(plus(START, state.day)));
    // Put a request we know signs at the standard rate.
    const id = Array.from({ length: 4000 }, (_, i) => i + 5000).find((n) => mixedRandom(`mice-decision:${n}:10`) < conversionChance({ ...request, id: n }, STANDARD_DISCOUNT));
    const known = { ...request, id, days: 2, attendees: 20 };
    state = { ...state, hotel: { ...state.hotel, hotelState: { ...state.hotel.hotelState, mice: { ...state.hotel.hotelState.mice, requests: [known] } } } };
    const signed = respondToRequest(state.hotel, id, { type: "accept" }, { day: state.day, date });
    expect(miceEvents(signed.hotelState)).toHaveLength(1);
    const event = miceEvents(signed.hotelState)[0];
    expect(signed.reservations.filter((item) => item.source === "mice-meeting")).toHaveLength(1);
    state = { ...state, hotel: signed };

    // Play up to the last day of the event and past it.
    let firstDayOccupied = null;
    let firstDayRoomRevenue = null;
    while (iso(plus(START, state.day)) <= event.endDate) {
      const isFirstDay = iso(plus(START, state.day)) === event.startDate;
      const played = await runCareerDay({ state, rng: () => 0.999 });
      if (isFirstDay) {
        firstDayOccupied = played.report.dailyReport.hotelRevenue.occupiedRooms;
        firstDayRoomRevenue = played.report.dailyReport.hotelRevenue.roomRevenue;
      }
      state = played.state;
    }
    // The meeting room and the four bedrooms are full on the first day, and earn.
    expect(firstDayOccupied).toBeGreaterThanOrEqual(5);
    expect(firstDayRoomRevenue).toBeGreaterThanOrEqual(Math.round(450 * 0.9) + 4 * Math.round(120 * 0.9));
    const done = miceEvents(state.hotel.hotelState).find((item) => item.id === event.id);
    expect(done.status).toBe("done");
    expect(done.completedOn).toBe(event.endDate);
  });

  it("the review of the day reports new quotes, events under way and finished ones", async () => {
    let state = career();
    let review = null;
    for (let i = 0; i < 40 && !review?.mice?.newRequests.length; i += 1) {
      state = await play(state, 1);
      review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    }
    expect(review.mice.newRequests.length).toBeGreaterThan(0);
    expect(review.causalChain.some((line) => /Nouvelle demande de devis/.test(line))).toBe(true);
    expect(review.mice.pending).toBeGreaterThan(0);
  });

  it("reports an event that runs, then that ends", async () => {
    let state = withEvent(career(), { days: 2 });
    state = await play(state, 1);
    let review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    expect(review.mice.today.map((event) => event.company)).toEqual(["Novatek Solutions"]);
    expect(review.causalChain.some((line) => /Séminaire Novatek Solutions aujourd'hui/.test(line))).toBe(true);
    state = await play(state, 1);
    review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    expect(review.mice.completed.map((event) => event.company)).toEqual(["Novatek Solutions"]);
    expect(review.causalChain.some((line) => /Séminaire Novatek Solutions terminé/.test(line))).toBe(true);
  });

  it("an event starting soon is announced", async () => {
    const state = await play(withEvent(career(), { startDate: iso(plus(START, 3)) }), 1);
    const review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    expect(review.mice.startingSoon.map((event) => event.company)).toEqual(["Novatek Solutions"]);
    expect(review.causalChain.some((line) => /Séminaire Novatek Solutions le/.test(line))).toBe(true);
  });

  it("a hotel with nothing to report has no MICE section", async () => {
    const state = await play(career(bedrooms), 2);
    expect(buildDailyReview({ careerState: state, dashboardState: dashboard }).mice).toBeNull();
  });

  it("is deterministic: the same career gets the same quotes", async () => {
    const a = await play(career(), 30);
    const b = await play(career(), 30);
    expect(a.hotel.hotelState.mice).toEqual(b.hotel.hotelState.mice);
  });
});

describe("mice / the report of a day", () => {
  it("is null when nothing is going on", () => {
    expect(describeMiceDay({}, START)).toBeNull();
    expect(describeMiceDay(undefined, START)).toBeNull();
  });

  it("counts the quotes still waiting", () => {
    const date = D("2026-01-01");
    const day = Array.from({ length: 400 }, (_, i) => plus(date, i)).find((d) => generateRequest({ hotelState: {}, rooms: allRooms, date: d }));
    const state = advanceMice({}, { date: day, rooms: allRooms });
    expect(describeMiceDay(state, day)).toMatchObject({ pending: 1 });
    expect(describeMiceDay(state, day).newRequests).toHaveLength(1);
  });
});
