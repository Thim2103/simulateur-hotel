import { buildStatusSummary, occupancyOf, ratingOf, urgentItems } from "./statusSummary";
import { isVip } from "../clients/guestProfiles";

const START = "2026-09-14";
const rooms = [
  { id: 1, number: "101", type: "standard", status: "occupée" },
  { id: 2, number: "102", type: "standard", status: "libre" },
  { id: 3, number: "201", type: "deluxe", status: "occupée" },
  { id: 4, number: "202", type: "deluxe", status: "libre" },
  { id: 9, number: "S01", type: "seminar", status: "occupée" },
];
const review = (id, rating, impact) => ({ id, day: 1, rating, impact, weight: 1, applied: 0, profile: "family", guestName: `Client ${id}` });

function career(hotelState = {}, extra = {}) {
  return { day: 2, startDate: START, hotel: { rooms, reservations: [], hotelState: { finance: { revenue: [1000, 2000], costs: [500] }, ...hotelState } }, ...extra };
}

describe("occupancyOf", () => {
  it("counts the bedrooms only: a meeting room is not one", () => {
    expect(occupancyOf(rooms)).toEqual({ occupied: 2, total: 4, rate: 50 });
  });

  it("is 0 % of 0 without rooms", () => {
    expect(occupancyOf(undefined)).toEqual({ occupied: 0, total: 0, rate: 0 });
  });
});

describe("ratingOf", () => {
  it("averages the reviews' stars to one decimal", () => {
    expect(ratingOf({ guestReviews: [review("a", 5, 0.6), review("b", 4, 0.3), review("c", 4, 0.3)] })).toEqual({ average: 4.3, count: 3 });
  });

  it("has no average without reviews", () => {
    expect(ratingOf({})).toEqual({ average: null, count: 0 });
  });
});

describe("urgentItems", () => {
  it("is empty when nothing needs the manager", () => {
    expect(urgentItems(career())).toEqual([]);
  });

  it("counts the breakdowns still to repair, and says how many are critical", () => {
    const items = urgentItems(
      career({
        activeIncidents: [
          { id: "i1", status: "active", severity: "critical" },
          { id: "i2", status: "active", severity: "minor" },
          { id: "i3", status: "repairing", severity: "critical" },
          { id: "i4", status: "resolved", severity: "critical" },
        ],
      })
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: "incidents", tone: "danger", count: 2 });
    expect(items[0].label).toMatch(/2 pannes à réparer dont 1 critique/);
  });

  it("counts the bad reviews nobody has answered", () => {
    const items = urgentItems(career({ guestReviews: [review("a", 1, -1.2), review("b", 5, 0.6)] }));
    expect(items).toEqual([expect.objectContaining({ id: "reviews", count: 1, to: "/clients/reviews" })]);
  });

  it("lists the V.I.P.s in the hotel that nobody has looked after", () => {
    const vipId = [...Array(300).keys()].find((id) => isVip({ id }, { type: "suite" }));
    const suite = { id: 5, number: "301", type: "suite", status: "occupée" };
    // Career day 2 from 2026-09-14 is the night of 2026-09-16.
    const reservation = { id: vipId, room_id: 5, client_name: "Aline Vasseur", arrival: "2026-09-15", departure: "2026-09-18", status: "confirmée" };
    const state = career();
    state.hotel.rooms = [...rooms, suite];
    state.hotel.reservations = [reservation];
    const items = urgentItems(state);
    expect(items).toEqual([expect.objectContaining({ id: "vip", tone: "vip", count: 1 })]);
    expect(items[0].label).toBe("1 V.I.P. à accueillir : Aline Vasseur");
  });

  it("counts the seminar quotes still open and the GM Desk messages", () => {
    const quote = { id: 1, company: "Novatek", attendees: 20, days: 1, startDate: "2026-09-30", receivedOn: "2026-09-14", expiresOn: "2026-09-25", expectedDiscount: 0.1, status: "pending" };
    const items = urgentItems(career({ mice: { requests: [quote], events: [], nextId: 2, lastOutcome: null } }), { gmMessages: 3 });
    expect(items.map((item) => [item.id, item.count])).toEqual([["mice", 1], ["gm", 3]]);
  });

  it("does not throw on a career with no hotel state at all", () => {
    expect(urgentItems({ day: 0, hotel: {} })).toEqual([]);
  });
});

describe("buildStatusSummary", () => {
  it("is null before there is a career", () => {
    expect(buildStatusSummary(null)).toBeNull();
    expect(buildStatusSummary({ day: 0 })).toBeNull();
  });

  it("puts treasury, date, season, occupancy, rating and the notification count together", () => {
    const summary = buildStatusSummary(career({ guestReviews: [review("a", 1, -1.2)] }), { gmMessages: 2 });
    expect(summary.treasury).toBe(2500);
    expect(summary.day).toBe(2);
    expect(summary.date).toBe("2026-09-16");
    expect(summary.season).toEqual(expect.objectContaining({ id: expect.any(String), label: expect.any(String), icon: expect.any(String) }));
    expect(summary.occupancy.rate).toBe(50);
    expect(summary.rating).toEqual({ average: 1, count: 1 });
    expect(summary.notificationCount).toBe(3);
  });

  it("never reports a negative treasury", () => {
    expect(buildStatusSummary(career({ finance: { revenue: [100], costs: [900] } })).treasury).toBe(0);
  });
});
