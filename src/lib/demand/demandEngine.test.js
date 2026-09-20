import {
  NEUTRAL_REPUTATION,
  MIN_MULTIPLIER,
  MAX_MULTIPLIER,
  seasonFactor,
  reputationFactor,
  priceIndex,
  priceFactor,
  eventFactor,
  incidentFactor,
  computeDemand,
  generateBookings,
  applyDemand,
  describeDemand,
} from "./demandEngine";
import { updateReservations } from "../dailyCycle/updateReservations";
import { calculateHotelRevenue } from "../dailyCycle/calculateHotelRevenue";

const JULY_WED = new Date("2026-07-15T12:00:00Z"); // high season, midweek
const JAN_TUE = new Date("2026-01-13T12:00:00Z"); // low season, midweek
const NOV_WED = new Date("2026-11-11T12:00:00Z");

function rooms(count = 6, price = 120) {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, number: String(100 + i), type: "standard", status: "libre", price }));
}
const hotelWith = (overrides = {}) => ({ progression: { player: { reputation: 60 } }, ...overrides });
const incident = (overrides = {}) => ({ id: "i1", zone: "laundry", severity: "critical", status: "active", ...overrides });

function overlaps(a, b) {
  return a.arrival < b.departure && b.arrival < a.departure;
}

describe("demandEngine / individual factors", () => {
  it("season: summer beats winter, and weekends beat midweek", () => {
    expect(seasonFactor(JULY_WED)).toBeGreaterThan(seasonFactor(JAN_TUE));
    expect(seasonFactor(new Date("2026-07-18T12:00:00Z"))).toBeGreaterThan(seasonFactor(JULY_WED)); // Saturday
  });

  it("reputation: neutral at the neutral reputation, rising above and falling below, bounded", () => {
    expect(reputationFactor(NEUTRAL_REPUTATION)).toBe(1);
    expect(reputationFactor(90)).toBeGreaterThan(1);
    expect(reputationFactor(20)).toBeLessThan(1);
    expect(reputationFactor(1000)).toBeLessThanOrEqual(1.4);
    expect(reputationFactor(-1000)).toBeGreaterThanOrEqual(0.5);
  });

  it("priceIndex: 1 with no reservations, and follows the player's price level over base rates", () => {
    expect(priceIndex(rooms(), [], JULY_WED)).toBe(1);
    const reservations = [{ id: 1, room_id: 1, status: "confirmée", price: 132, departure: "2026-07-20" }];
    expect(priceIndex(rooms(), reservations, JULY_WED)).toBeCloseTo(1.1);
  });

  it("priceIndex ignores cancelled and already-finished stays", () => {
    const reservations = [
      { id: 1, room_id: 1, status: "annulée", price: 240, departure: "2026-07-20" },
      { id: 2, room_id: 1, status: "confirmée", price: 240, departure: "2026-07-01" },
    ];
    expect(priceIndex(rooms(), reservations, JULY_WED)).toBe(1);
  });

  it("price: higher prices cut demand, lower prices raise it, and a better reputation tolerates higher prices", () => {
    expect(priceFactor(1.2, 60)).toBeLessThan(priceFactor(1.0, 60));
    expect(priceFactor(0.9, 60)).toBeGreaterThan(priceFactor(1.0, 60));
    expect(priceFactor(1.2, 90)).toBeGreaterThan(priceFactor(1.2, 30));
  });

  it("events: positive-revenue events lift demand, negative ones cut it, capped", () => {
    expect(eventFactor([{ impact: { revenue: 100 } }])).toBeGreaterThan(1);
    expect(eventFactor([{ impact: { revenue: -100 } }])).toBeLessThan(1);
    expect(eventFactor(Array.from({ length: 20 }, () => ({ impact: { revenue: 100 } })))).toBeCloseTo(1.15);
    expect(eventFactor(undefined)).toBe(1);
  });

  it("incidents: none is neutral, more severe cuts more, a repair in progress cuts less, capped", () => {
    expect(incidentFactor({})).toBe(1);
    expect(incidentFactor({ activeIncidents: [incident({ severity: "critical" })] })).toBeLessThan(incidentFactor({ activeIncidents: [incident({ severity: "minor" })] }));
    expect(incidentFactor({ activeIncidents: [incident({ status: "repairing" })] })).toBeGreaterThan(incidentFactor({ activeIncidents: [incident()] }));
    expect(incidentFactor({ activeIncidents: [incident({ status: "resolved" })] })).toBe(1);
    const many = Array.from({ length: 20 }, (_, i) => incident({ id: `i${i}` }));
    expect(incidentFactor({ activeIncidents: many })).toBeCloseTo(0.7);
  });
});

describe("demandEngine / computeDemand", () => {
  const args = (hotelState, date = NOV_WED) => ({ hotelState, rooms: rooms(), reservations: [], referenceDate: date });

  it("multiplies the five factors and exposes each one", () => {
    const { multiplier, factors } = computeDemand(args(hotelWith()));
    expect(Object.keys(factors).sort()).toEqual(["events", "incidents", "price", "reputation", "season"]);
    const product = Object.values(factors).reduce((a, b) => a * b, 1);
    expect(multiplier).toBeCloseTo(product);
  });

  it("a well-reputed hotel gets more demand than a poorly-reputed one", () => {
    const good = computeDemand(args(hotelWith({ progression: { player: { reputation: 90 } } }))).multiplier;
    const bad = computeDemand(args(hotelWith({ progression: { player: { reputation: 30 } } }))).multiplier;
    expect(good).toBeGreaterThan(1);
    expect(bad).toBeLessThan(good);
  });

  it("open incidents lower demand on top of everything else", () => {
    const clean = computeDemand(args(hotelWith())).multiplier;
    const broken = computeDemand(args(hotelWith({ activeIncidents: [incident()] }))).multiplier;
    expect(broken).toBeLessThan(clean);
  });

  it("falls back to a neutral reputation when none is stored yet", () => {
    expect(computeDemand(args({})).reputation).toBe(NEUTRAL_REPUTATION);
  });

  it("stays within the global bounds", () => {
    const manyIncidents = Array.from({ length: 9 }, (_, i) => incident({ id: `i${i}` }));
    const worst = computeDemand(args(hotelWith({ progression: { player: { reputation: 0 } }, activeIncidents: manyIncidents }), JAN_TUE));
    expect(worst.multiplier).toBeGreaterThanOrEqual(MIN_MULTIPLIER);
    const best = computeDemand(args(hotelWith({ progression: { player: { reputation: 100 } } }), JULY_WED));
    expect(best.multiplier).toBeLessThanOrEqual(MAX_MULTIPLIER);
  });
});

describe("demandEngine / generateBookings", () => {
  const base = { rooms: rooms(), reservations: [], referenceDate: JULY_WED };

  it("creates well-formed, confirmed, conflict-free reservations with fresh ids and a created_at", () => {
    const { reservations, created } = generateBookings({ ...base, multiplier: 1 });
    expect(created).toBeGreaterThan(0);
    expect(new Set(reservations.map((r) => r.id)).size).toBe(reservations.length);
    reservations.forEach((r) => {
      expect(r.status).toBe("confirmée");
      expect(r.arrival < r.departure).toBe(true);
      expect(r.created_at).toEqual(expect.any(String));
      expect(r.price).toBe(120);
    });
    reservations.forEach((a, i) =>
      reservations.slice(i + 1).forEach((b) => {
        if (a.room_id === b.room_id) expect(overlaps(a, b)).toBe(false);
      })
    );
  });

  it("continues ids after the existing ones and never touches existing reservations", () => {
    const existing = [{ id: 41, room_id: 1, status: "confirmée", arrival: "2026-07-14", departure: "2026-07-16", price: 120 }];
    const { reservations } = generateBookings({ ...base, reservations: existing, multiplier: 1 });
    expect(reservations[0]).toBe(existing[0]);
    expect(Math.min(...reservations.slice(1).map((r) => r.id))).toBe(42);
  });

  it("generates more bookings at higher demand, fewer at lower", () => {
    const at = (multiplier) => generateBookings({ ...base, multiplier }).created;
    expect(at(1.4)).toBeGreaterThan(at(1));
    expect(at(0.5)).toBeLessThan(at(1));
  });

  it("carries fractional demand over instead of dropping it", () => {
    const first = generateBookings({ ...base, multiplier: 0.4, carry: 0 }); // 6 rooms * 0.3 * 0.4 = 0.72
    expect(first.created).toBe(0);
    expect(first.carry).toBeCloseTo(0.72);
    const second = generateBookings({ ...base, multiplier: 0.4, carry: first.carry }); // 1.44
    expect(second.created).toBe(1);
    expect(second.carry).toBeCloseTo(0.44);
  });

  it("prices new bookings at the player's price level", () => {
    const { reservations } = generateBookings({ ...base, multiplier: 1, priceIdx: 1.1 });
    reservations.forEach((r) => expect(r.price).toBe(132));
  });

  it("turns away requests it has no free room for, without double-booking", () => {
    const { reservations, turnedAway } = generateBookings({ rooms: rooms(1), reservations: [], referenceDate: JULY_WED, multiplier: 1.8, carry: 10 });
    expect(turnedAway).toBeGreaterThan(0);
    reservations.forEach((a, i) => reservations.slice(i + 1).forEach((b) => expect(overlaps(a, b)).toBe(false)));
  });

  it("skips rooms out of service and handles a hotel with none", () => {
    const out = rooms(2).map((room) => ({ ...room, status: "hors_service" }));
    expect(generateBookings({ rooms: out, reservations: [], referenceDate: JULY_WED, multiplier: 1 }).created).toBe(0);
    expect(generateBookings({ rooms: [], reservations: [], referenceDate: JULY_WED, multiplier: 1 }).created).toBe(0);
  });

  it("is deterministic", () => {
    const args = { ...base, multiplier: 1.2 };
    expect(generateBookings(args)).toEqual(generateBookings(args));
  });
});

describe("demandEngine / applyDemand", () => {
  it("returns extended reservations, the demand state to persist, and a report", () => {
    const result = applyDemand({ hotelState: hotelWith(), rooms: rooms(), reservations: [], referenceDate: JULY_WED });
    expect(result.reservations.length).toBe(result.demandReport.newBookings);
    expect(result.demandState).toEqual({ carry: expect.any(Number), lastMultiplier: result.demandReport.multiplier });
    expect(result.demandReport).toMatchObject({ date: "2026-07-15", newBookings: expect.any(Number), turnedAway: expect.any(Number) });
    expect(Object.keys(result.demandReport.factors)).toHaveLength(5);
  });

  it("feeds the persisted carry back in the next day", () => {
    const day1 = applyDemand({ hotelState: hotelWith(), rooms: rooms(1), reservations: [], referenceDate: JAN_TUE });
    const day2 = applyDemand({
      hotelState: hotelWith({ demand: day1.demandState }),
      rooms: rooms(1),
      reservations: day1.reservations,
      referenceDate: new Date("2026-01-14T12:00:00Z"),
    });
    // One room in low season yields well under one booking a day: nothing is
    // created on day 1, and its fraction is still there to build on day 2.
    expect(day1.demandReport.newBookings).toBe(0);
    expect(day1.demandState.carry).toBeGreaterThan(0);
    expect(day2.demandState.carry).toBeGreaterThan(day1.demandState.carry);
  });
});

// The behaviour the player must actually feel: neglect -> fewer guests.
describe("demandEngine / occupancy over time", () => {
  function simulate(hotelState, days = 30) {
    const allRooms = rooms(10);
    let reservations = [];
    let state = hotelState;
    let occupiedTotal = 0;
    let bookings = 0;
    for (let d = 0; d < days; d += 1) {
      const date = new Date(JULY_WED.getTime() + d * 86400000);
      const demand = applyDemand({ hotelState: state, rooms: allRooms, reservations, referenceDate: date });
      state = { ...state, demand: demand.demandState };
      reservations = demand.reservations;
      bookings += demand.demandReport.newBookings;
      occupiedTotal += calculateHotelRevenue({ reservations, referenceDate: date }).occupiedRooms;
      reservations = updateReservations({ rooms: allRooms, reservations, referenceDate: date }).reservations;
    }
    return { occupancy: occupiedTotal / (days * allRooms.length), bookings };
  }

  it("a neglected hotel (bad reputation + open critical incidents) fills perceptibly less than a healthy one", () => {
    const healthy = simulate(hotelWith({ progression: { player: { reputation: 75 } } }));
    const neglected = simulate(hotelWith({ progression: { player: { reputation: 30 } }, activeIncidents: [incident(), incident({ id: "i2" })] }));
    expect(healthy.occupancy).toBeGreaterThan(0.4);
    expect(neglected.occupancy).toBeLessThan(healthy.occupancy - 0.1);
    expect(neglected.bookings).toBeLessThan(healthy.bookings);
  });

  it("repairing the incidents restores demand", () => {
    const withIncident = simulate(hotelWith({ activeIncidents: [incident(), incident({ id: "i2" })] }));
    const repaired = simulate(hotelWith({ activeIncidents: [incident({ status: "resolved" }), incident({ id: "i2", status: "resolved" })] }));
    expect(repaired.bookings).toBeGreaterThan(withIncident.bookings);
  });

  it("raising prices lowers demand", () => {
    const demandAt = (priceMultiplier) => {
      const allRooms = rooms(10);
      const reservations = allRooms.map((room, i) => ({
        id: i + 1,
        room_id: room.id,
        status: "confirmée",
        arrival: "2026-07-10",
        departure: "2026-08-30",
        price: Math.round(120 * priceMultiplier),
      }));
      return applyDemand({ hotelState: hotelWith(), rooms: allRooms, reservations, referenceDate: JULY_WED }).demandReport.multiplier;
    };
    expect(demandAt(1.3)).toBeLessThan(demandAt(1.0));
  });
});

describe("demandEngine / describeDemand", () => {
  const report = (multiplier, factors) => ({ multiplier, factors, newBookings: 3, turnedAway: 1 });

  it("returns null without a report", () => {
    expect(describeDemand(null)).toBeNull();
    expect(describeDemand({})).toBeNull();
  });

  it("strong demand names the biggest positive driver", () => {
    const d = describeDemand(report(1.15, { reputation: 1.3, price: 1, season: 0.97, events: 1, incidents: 1 }));
    expect(d.tone).toBe("strong");
    expect(d.headline).toBe("Demande forte (115 %) grâce à une excellente réputation.");
  });

  it("weak demand names the biggest negative driver and shows the drop", () => {
    const d = describeDemand(report(0.8, { reputation: 0.95, price: 1, season: 1, events: 1, incidents: 0.7 }));
    expect(d.tone).toBe("weak");
    expect(d.headline).toBe("Demande en baisse (-20 %) suite à des pannes non réparées et les avis négatifs qui en découlent.");
  });

  it("stable demand within +/-10 %", () => {
    const d = describeDemand(report(1.02, { reputation: 1.02, price: 1, season: 1, events: 1, incidents: 1 }));
    expect(d.tone).toBe("stable");
    expect(d.headline).toBe("Demande stable (102 %).");
  });

  it("lists only factors that actually moved, biggest first, with booking counts", () => {
    const d = describeDemand(report(0.8, { reputation: 1, price: 0.9, season: 0.95, events: 1, incidents: 0.7 }));
    expect(d.drivers.map((x) => x.key)).toEqual(["incidents", "price", "season"]);
    expect(d).toMatchObject({ newBookings: 3, turnedAway: 1 });
  });

  it("falls back to a generic driver when nothing moved in the direction of the headline", () => {
    const d = describeDemand(report(1.2, { reputation: 1, price: 1, season: 1, events: 1, incidents: 1 }));
    expect(d.headline).toBe("Demande forte (120 %) grâce à l'ensemble des facteurs.");
  });
});
