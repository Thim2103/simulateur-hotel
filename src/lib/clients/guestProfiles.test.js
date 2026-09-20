import { PROFILES, VIP_WEIGHT, VIP_CHANCE, LONG_STAY_NIGHTS, mixedRandom, stayNights, profileIdFor, profileFor, weightOf, isVip, followersOf, vipGuestsInHouse } from "./guestProfiles";

const stay = (id, extra = {}) => ({ id, room_id: 1, arrival: "2026-09-10", departure: "2026-09-12", status: "confirmée", segment: "leisure", client_name: `Client ${id}`, ...extra });
const standard = { id: 1, number: "101", type: "standard" };
const suite = { id: 1, number: "301", type: "suite" };
const ids = (count) => Array.from({ length: count }, (_, i) => i + 1);

describe("guestProfiles / the four profiles", () => {
  it("has family, business, long stay and V.I.P., each with a label, an icon and a weight", () => {
    expect(Object.keys(PROFILES).sort()).toEqual(["business", "family", "long-stay", "vip"]);
    Object.values(PROFILES).forEach((profile) => {
      expect(profile.label && profile.icon && profile.description).toBeTruthy();
      expect(profile.weight).toBeGreaterThanOrEqual(1);
    });
  });

  it("a V.I.P.'s weight is three times anyone else's", () => {
    expect(VIP_WEIGHT).toBe(3);
    expect(weightOf("vip")).toBe(3);
    ["family", "business", "long-stay"].forEach((id) => expect(weightOf(id)).toBe(1));
    expect(weightOf("unknown")).toBe(1);
  });
});

describe("guestProfiles / classifying a stay", () => {
  it("counts the nights, at least one", () => {
    expect(stayNights(stay(1))).toBe(2);
    expect(stayNights(stay(1, { departure: "2026-09-10" }))).toBe(1);
    expect(stayNights(undefined)).toBe(1);
  });

  it("is stable: the same stay is always the same guest", () => {
    ids(80).forEach((id) => expect(profileIdFor(stay(id), standard)).toBe(profileIdFor(stay(id), standard)));
  });

  it("a business booking is a business guest", () => {
    const business = ids(200).map((id) => profileIdFor(stay(id, { segment: "business" }), standard)).filter((profile) => profile !== "vip");
    expect(new Set(business)).toEqual(new Set(["business"]));
  });

  it("a leisure booking is a family", () => {
    const leisure = ids(200).map((id) => profileIdFor(stay(id), standard)).filter((profile) => profile !== "vip");
    expect(new Set(leisure)).toEqual(new Set(["family"]));
  });

  it("a stay of four nights or more is a long stay", () => {
    const long = ids(200).map((id) => profileIdFor(stay(id, { departure: "2026-09-14" }), standard)).filter((profile) => profile !== "vip");
    expect(LONG_STAY_NIGHTS).toBe(4);
    expect(new Set(long)).toEqual(new Set(["long-stay"]));
    expect(profileIdFor(stay(999, { departure: "2026-09-13", segment: "leisure" }), standard)).not.toBe("long-stay");
  });

  it("V.I.P.s are rare in a standard room and more common in a suite", () => {
    const share = (room) => ids(1000).filter((id) => isVip(stay(id), room)).length / 1000;
    expect(share(standard)).toBeGreaterThan(0.01);
    expect(share(standard)).toBeLessThan(0.1);
    expect(share(suite)).toBeGreaterThan(share(standard) * 2);
    expect(share(suite)).toBeLessThan(0.35);
    expect(VIP_CHANCE.suite).toBeGreaterThan(VIP_CHANCE.default);
  });

  it("a V.I.P. stays a V.I.P. whatever the booking says", () => {
    const vip = ids(3000).find((id) => isVip(stay(id), standard));
    expect(profileIdFor(stay(vip, { segment: "business", departure: "2026-09-20" }), standard)).toBe("vip");
  });

  it("returns the whole profile", () => {
    const vip = ids(3000).find((id) => isVip(stay(id), standard));
    expect(profileFor(stay(vip), standard)).toBe(PROFILES.vip);
  });

  it("copes with missing data", () => {
    expect(profileIdFor(undefined, undefined)).toBeTruthy();
  });

  it("V.I.P. followers are between 20 000 and 500 000, stable per stay", () => {
    ids(50).forEach((id) => {
      expect(followersOf(stay(id))).toBeGreaterThanOrEqual(20000);
      expect(followersOf(stay(id))).toBeLessThan(500000);
      expect(followersOf(stay(id))).toBe(followersOf(stay(id)));
    });
  });
});

describe("guestProfiles / V.I.P.s in the hotel", () => {
  const rooms = [suite, { id: 2, number: "102", type: "standard" }];
  const vipId = ids(2000).find((id) => isVip(stay(id), suite));
  const nonVipId = ids(2000).find((id) => !isVip(stay(id, { room_id: 2 }), rooms[1]));
  const date = new Date("2026-09-11T12:00:00Z");

  it("finds the V.I.P. staying tonight, with their room, followers and departure", () => {
    const guests = vipGuestsInHouse({ reservations: [stay(vipId)], rooms, date });
    expect(guests).toHaveLength(1);
    expect(guests[0]).toMatchObject({ reservationId: vipId, guestName: `Client ${vipId}`, roomId: 1, roomNumber: "301", departure: "2026-09-12" });
    expect(guests[0].followers).toBeGreaterThanOrEqual(20000);
  });

  it("not before they arrive, nor on the day they leave", () => {
    expect(vipGuestsInHouse({ reservations: [stay(vipId)], rooms, date: new Date("2026-09-09T12:00:00Z") })).toEqual([]);
    expect(vipGuestsInHouse({ reservations: [stay(vipId)], rooms, date: new Date("2026-09-12T12:00:00Z") })).toEqual([]);
    expect(vipGuestsInHouse({ reservations: [stay(vipId)], rooms, date: new Date("2026-09-10T12:00:00Z") })).toHaveLength(1);
  });

  it("not a cancelled stay, nor an ordinary guest", () => {
    expect(vipGuestsInHouse({ reservations: [stay(vipId, { status: "annulée" })], rooms, date })).toEqual([]);
    expect(vipGuestsInHouse({ reservations: [stay(nonVipId, { room_id: 2 })], rooms, date })).toEqual([]);
  });

  it("copes with no data", () => {
    expect(vipGuestsInHouse()).toEqual([]);
    expect(vipGuestsInHouse({ reservations: [stay(vipId)], date })).toHaveLength(0 + (isVip(stay(vipId), undefined) ? 1 : 0));
  });
});

describe("guestProfiles / mixedRandom", () => {
  it("is deterministic and within [0, 1)", () => {
    ids(100).forEach((id) => {
      expect(mixedRandom(`x:${id}`)).toBe(mixedRandom(`x:${id}`));
      expect(mixedRandom(`x:${id}`)).toBeGreaterThanOrEqual(0);
      expect(mixedRandom(`x:${id}`)).toBeLessThan(1);
    });
  });

  it("does not give neighbouring guests the same outcome", () => {
    // Plain FNV-1a returns 0.41, 0.41, 0.42... for consecutive ids; here they scatter.
    const values = ids(40).map((id) => mixedRandom(`posts:${id}`));
    const steps = values.slice(1).map((value, index) => Math.abs(value - values[index]));
    expect(steps.filter((step) => step > 0.1).length).toBeGreaterThan(20);
  });

  it("is spread evenly", () => {
    const below = ids(2000).filter((id) => mixedRandom(`spread:${id}`) < 0.5).length;
    expect(below).toBeGreaterThan(900);
    expect(below).toBeLessThan(1100);
  });
});
