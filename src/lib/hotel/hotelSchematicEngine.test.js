import { arrivalsDeparturesToday, guestInRoom, breakfastCoversForecast } from "./hotelSchematicEngine";

const rooms = [
  { id: 1, number: "101", status: "occupée", capacity: 2 },
  { id: 2, number: "102", status: "libre", capacity: 2 },
  { id: 3, number: "103", status: "occupée", capacity: 3 },
];

const reservations = [
  { id: 1, room_id: 1, client_name: "Ada Lovelace", arrival: "2026-09-20", departure: "2026-09-23", status: "confirmée" },
  { id: 2, room_id: 2, client_name: "Grace Hopper", arrival: "2026-09-23", departure: "2026-09-25", status: "confirmée" },
  { id: 3, room_id: 3, client_name: "Alan Turing", arrival: "2026-09-21", departure: "2026-09-23", status: "annulée" },
];

describe("hotelSchematicEngine / arrivalsDeparturesToday", () => {
  it("counts arrivals and departures landing on the given date", () => {
    expect(arrivalsDeparturesToday(reservations, "2026-09-23")).toEqual({ arrivals: 1, departures: 1 });
  });

  it("ignores cancelled reservations", () => {
    expect(arrivalsDeparturesToday(reservations, "2026-09-23").departures).toBe(1); // Alan Turing's cancelled departure doesn't count
  });

  it("reads zero for an empty list (a brand-new inn on day 0)", () => {
    expect(arrivalsDeparturesToday([], "2026-09-23")).toEqual({ arrivals: 0, departures: 0 });
  });
});

describe("hotelSchematicEngine / guestInRoom", () => {
  it("finds the guest currently staying in the room", () => {
    expect(guestInRoom(rooms[0], reservations, "2026-09-22")).toBe("Ada Lovelace");
  });

  it("reads null once the guest has departed", () => {
    expect(guestInRoom(rooms[0], reservations, "2026-09-23")).toBeNull();
  });

  it("reads null for a room with no matching reservation", () => {
    expect(guestInRoom(rooms[1], reservations, "2026-09-22")).toBeNull();
  });
});

describe("hotelSchematicEngine / breakfastCoversForecast", () => {
  it("sums the capacity of occupied rooms only", () => {
    expect(breakfastCoversForecast(rooms)).toBe(5); // room 101 (2) + room 103 (3), room 102 is empty
  });

  it("reads zero when nothing is occupied", () => {
    expect(breakfastCoversForecast([{ id: 1, status: "libre", capacity: 2 }])).toBe(0);
  });
});
