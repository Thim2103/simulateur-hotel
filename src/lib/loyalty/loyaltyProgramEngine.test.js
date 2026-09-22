import {
  CLUB_NAME,
  LAUNCH_COST,
  MAX_MEMBERS,
  BASE_SATISFACTION,
  JOIN_CHANCE,
  RETURN_PER_WEIGHT,
  MAX_RETURN_BOOST,
  DIRECT_PER_WEIGHT,
  MAX_DIRECT_SHARE,
  MAX_PRICE_RELIEF,
  TIERS,
  BENEFITS,
  BENEFIT_IDS,
  isLaunched,
  members,
  tierOf,
  membersByTier,
  enabledBenefits,
  memberSatisfaction,
  programEffects,
  loyaltyDemandFactor,
  perkCostFor,
  loyaltyCostOn,
  launchOptions,
  launchProgram,
  setBenefit,
  advanceLoyalty,
  loyaltyNewsOn,
  describeProgram,
  lastOutcome,
} from "./loyaltyProgramEngine";
import { stayRating } from "../clients/guestReviewEngine";
import { mixedRandom } from "../clients/guestProfiles";

const DATE = "2026-09-14";
const NEXT = "2026-09-15";
const hotel = (extra = {}) => ({ finance: { revenue: [50000], costs: [0] }, progression: { player: { reputation: 70 } }, ...extra });
const launched = (extra = {}) => launchProgram({ hotelState: hotel(extra) }, { day: 1, date: DATE }).hotelState;
const member = (n, stays = 1, extra = {}) => ({ id: `member:${n}`, name: `Membre ${n}`, stays, joinedDay: 0, lastStayDay: 0, tier: tierOf(stays), ...extra });
const withMembers = (list, extra = {}) => {
  const base = launched(extra);
  return { ...base, loyalty: { ...base.loyalty, members: list, nextId: list.length + 1 } };
};
const withPerks = (state, ids) => ({ ...state, loyalty: { ...state.loyalty, benefits: Object.fromEntries(ids.map((id) => [id, true])) } });
const stay = (id, arrival, departure, extra = {}) => ({ id, room_id: 1, room: "101", room_type: "standard", client_name: `Client ${id}`, arrival, departure, status: "confirmée", price: 120, source: "direct", segment: "leisure", metadata: {}, ...extra });
const memberStay = (id, memberId, arrival, departure, extra = {}) => stay(id, arrival, departure, { client_name: "Membre", metadata: { loyalty: { memberId, saved: false } }, ...extra });
const rooms = [{ id: 1, number: "101", type: "standard" }];
const rating = (id) => stayRating({ reservation: stay(id, "2026-09-12", DATE), room: rooms[0], hotelState: hotel() });
const ids = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const advance = (state, reservations, date = DATE, day = 5) => advanceLoyalty(state, { date, day, reservations, rooms });

describe("loyaltyProgramEngine / inert without a club", () => {
  it("does nothing, and keeps no state, before the launch", () => {
    const state = hotel();
    expect(isLaunched(state)).toBe(false);
    expect(advance(state, [stay(1, "2026-09-12", DATE)])).toBe(state);
    expect(members(state)).toEqual([]);
    expect(membersByTier(state)).toEqual({ silver: 0, gold: 0, platinum: 0, total: 0 });
    expect(programEffects(state)).toMatchObject({ active: false, returnBoost: 0, directShare: 0, priceRelief: 0 });
    expect(loyaltyDemandFactor(state)).toBe(1);
    expect(loyaltyCostOn(state, [memberStay(1, "member:1", DATE, NEXT)], DATE)).toBe(0);
    expect(memberSatisfaction(state)).toBe(0);
    expect(loyaltyNewsOn(state, DATE)).toEqual([]);
    expect(describeProgram(state).launched).toBe(false);
  });

  it("a launched club with no member yet has no effect either", () => {
    expect(programEffects(launched())).toMatchObject({ active: false, directShare: 0 });
    expect(loyaltyDemandFactor(launched())).toBe(1);
  });
});

describe("loyaltyProgramEngine / launching the club", () => {
  it("costs 5 000 EUR from the treasury", () => {
    const next = launchProgram({ hotelState: hotel() }, { day: 3, date: DATE }).hotelState;
    expect(LAUNCH_COST).toBe(5000);
    expect(next.finance.costs).toEqual([LAUNCH_COST]);
    expect(isLaunched(next)).toBe(true);
    expect(next.loyalty).toMatchObject({ launched: true, launchedDay: 3, launchedOn: DATE, members: [], nextId: 1 });
  });

  it("says so", () => {
    expect(lastOutcome(launched())).toMatchObject({ type: "launch", text: expect.stringContaining(CLUB_NAME) });
  });

  it("does nothing when the treasury cannot pay, and says why", () => {
    const poor = { hotelState: hotel({ finance: { revenue: [4999], costs: [0] } }) };
    expect(launchProgram(poor, { day: 1 })).toBe(poor);
    expect(launchOptions(poor.hotelState)).toEqual({ available: false, reason: "Trésorerie insuffisante", cost: LAUNCH_COST });
  });

  it("can be launched only once", () => {
    const bundle = { hotelState: launched() };
    expect(launchProgram(bundle, { day: 2 })).toBe(bundle);
    expect(launchOptions(bundle.hotelState)).toMatchObject({ available: false, reason: "Le club est déjà lancé" });
  });

  it("is available with enough in the treasury", () => {
    expect(launchOptions(hotel())).toEqual({ available: true, reason: "", cost: LAUNCH_COST });
  });

  it("leaves the rest of the bundle alone", () => {
    const next = launchProgram({ hotelState: hotel(), rooms: [1], reservations: [2] }, { day: 1 });
    expect(next.rooms).toEqual([1]);
    expect(next.reservations).toEqual([2]);
  });
});

describe("loyaltyProgramEngine / the perks", () => {
  it("are all off at first, and the satisfaction is at its base", () => {
    expect(enabledBenefits(launched())).toEqual([]);
    expect(memberSatisfaction(launched())).toBe(BASE_SATISFACTION);
    expect(BASE_SATISFACTION).toBe(55);
  });

  it("can be turned on and off", () => {
    const on = setBenefit({ hotelState: launched() }, "breakfast", true).hotelState;
    expect(enabledBenefits(on)).toEqual(["breakfast"]);
    const off = setBenefit({ hotelState: on }, "breakfast", false).hotelState;
    expect(enabledBenefits(off)).toEqual([]);
  });

  it("each lifts the satisfaction by its own bonus, up to 91", () => {
    let state = launched();
    let expected = BASE_SATISFACTION;
    BENEFIT_IDS.forEach((id) => {
      state = setBenefit({ hotelState: state }, id, true).hotelState;
      expected += BENEFITS[id].bonus;
      expect(memberSatisfaction(state)).toBe(expected);
    });
    expect(expected).toBe(91);
  });

  it("changing nothing returns the same bundle", () => {
    const bundle = { hotelState: launched() };
    expect(setBenefit(bundle, "breakfast", false)).toBe(bundle);
    const on = setBenefit(bundle, "breakfast", true);
    expect(setBenefit(on, "breakfast", true)).toBe(on);
  });

  it("does nothing before the launch, or for an unknown perk", () => {
    const early = { hotelState: hotel() };
    expect(setBenefit(early, "breakfast", true)).toBe(early);
    const bundle = { hotelState: launched() };
    expect(setBenefit(bundle, "champagne", true)).toBe(bundle);
  });

  it("the breakfast and the welcome drink go to every member, the late check-out and the upgrade to Gold and Platinum", () => {
    expect(BENEFITS.breakfast.minTier).toBe("silver");
    expect(BENEFITS.drink.minTier).toBe("silver");
    expect(BENEFITS.lateCheckout.minTier).toBe("gold");
    expect(BENEFITS.upgrade.minTier).toBe("gold");
  });

  it("have a price per member-night by tier", () => {
    const all = withPerks(launched(), BENEFIT_IDS);
    expect(perkCostFor(all, "silver")).toBe(BENEFITS.breakfast.cost + BENEFITS.drink.cost);
    expect(perkCostFor(all, "gold")).toBe(BENEFIT_IDS.reduce((sum, id) => sum + BENEFITS[id].cost, 0));
    expect(perkCostFor(all, "platinum")).toBe(perkCostFor(all, "gold"));
    expect(perkCostFor(launched(), "platinum")).toBe(0);
  });
});

describe("loyaltyProgramEngine / the tiers", () => {
  it.each([
    [0, "silver"],
    [1, "silver"],
    [2, "silver"],
    [3, "gold"],
    [5, "gold"],
    [6, "platinum"],
    [40, "platinum"],
  ])("%i stays make a %s member", (stays, tier) => {
    expect(tierOf(stays)).toBe(tier);
  });

  it("counts the members of each", () => {
    const state = withMembers([member(1, 1), member(2, 2), member(3, 3), member(4, 7), member(5, 9)]);
    expect(membersByTier(state)).toEqual({ silver: 2, gold: 1, platinum: 2, total: 5 });
  });

  it("weighs them 1, 1.5 and 2, and only the top two relax on prices", () => {
    expect(TIERS.silver).toMatchObject({ weight: 1, priceRelief: 0 });
    expect(TIERS.gold).toMatchObject({ weight: 1.5, minStays: 3 });
    expect(TIERS.platinum).toMatchObject({ weight: 2, minStays: 6 });
    expect(TIERS.gold.priceRelief).toBeGreaterThan(0);
    expect(TIERS.platinum.priceRelief).toBeGreaterThan(TIERS.gold.priceRelief);
  });
});

describe("loyaltyProgramEngine / joining the club", () => {
  const willJoin = (id, satisfaction = BASE_SATISFACTION) => {
    const stars = rating(id);
    return (JOIN_CHANCE[stars] || 0) > 0 && mixedRandom(`loyalty-join:${id}`) < JOIN_CHANCE[stars] * (0.5 + satisfaction / 100);
  };
  const joiner = ids(1, 800).find((id) => willJoin(id));
  const stayer = ids(1, 800).find((id) => (JOIN_CHANCE[rating(id)] || 0) > 0 && !willJoin(id));
  const unhappy = ids(1, 800).find((id) => rating(id) <= 3);

  it("a satisfied guest may join when leaving: the member takes their name, at Silver, with one stay", () => {
    const next = advance(launched(), [stay(joiner, "2026-09-12", DATE)]);
    expect(members(next)).toEqual([{ id: "member:1", name: `Client ${joiner}`, stays: 1, joinedDay: 5, lastStayDay: 5, tier: "silver" }]);
    expect(next.loyalty.nextId).toBe(2);
  });

  it("but not every one does", () => {
    expect(members(advance(launched(), [stay(stayer, "2026-09-12", DATE)]))).toEqual([]);
  });

  it("a guest rated 3 stars or less never joins", () => {
    expect(rating(unhappy)).toBeLessThanOrEqual(3);
    expect(members(advance(launched(), [stay(unhappy, "2026-09-12", DATE)]))).toEqual([]);
  });

  it("only guests who leave that day are considered", () => {
    expect(members(advance(launched(), [stay(joiner, "2026-09-12", NEXT)]))).toEqual([]);
    expect(members(advance(launched(), [stay(joiner, "2026-09-10", "2026-09-13")]))).toEqual([]);
  });

  it("a cancelled stay, or the meeting room of a seminar, brings nobody", () => {
    expect(members(advance(launched(), [stay(joiner, "2026-09-12", DATE, { status: "annulée" })]))).toEqual([]);
    expect(members(advance(launched(), [stay(joiner, "2026-09-12", DATE, { source: "mice-meeting" })]))).toEqual([]);
  });

  it("is decided by a stable hash: the same stay always gives the same answer", () => {
    const state = launched();
    const day = [stay(joiner, "2026-09-12", DATE), stay(stayer, "2026-09-12", DATE)];
    expect(advance(state, day)).toEqual(advance(state, day));
  });

  it("the more the perks please, the more join", () => {
    const plain = launched();
    const spoiled = withPerks(launched(), BENEFIT_IDS);
    const day = ids(1, 500).map((id) => stay(id, "2026-09-12", DATE));
    expect(members(advance(spoiled, day)).length).toBeGreaterThan(members(advance(plain, day)).length);
  });

  it("about 25 % of the 4-star guests and 45 % of the 5-star ones join at the base satisfaction, a bit more than that", () => {
    const five = ids(1, 800).filter((id) => rating(id) === 5);
    const joined = five.filter((id) => willJoin(id)).length;
    const scale = 0.5 + BASE_SATISFACTION / 100;
    expect(joined / five.length).toBeGreaterThan(JOIN_CHANCE[5] * scale * 0.7);
    expect(joined / five.length).toBeLessThan(JOIN_CHANCE[5] * scale * 1.3);
  });

  it("several guests leaving the same day get consecutive member numbers", () => {
    const next = advance(launched(), ids(1, 300).map((id) => stay(id, "2026-09-12", DATE)));
    const all = members(next);
    expect(all.length).toBeGreaterThan(3);
    expect(all.map((item) => item.id)).toEqual(all.map((_, i) => `member:${i + 1}`));
    expect(next.loyalty.nextId).toBe(all.length + 1);
  });

  it("the club has a ceiling", () => {
    const crowd = Array.from({ length: MAX_MEMBERS }, (_, i) => member(i + 1));
    const state = withMembers(crowd);
    expect(members(advance(state, [stay(joiner, "2026-09-12", DATE)]))).toHaveLength(MAX_MEMBERS);
  });
});

describe("loyaltyProgramEngine / members coming back", () => {
  it("counts the stay when they leave, and the tier climbs", () => {
    let state = withMembers([member(1, 2)]);
    state = advance(state, [memberStay(50, "member:1", "2026-09-12", DATE)], DATE, 7);
    expect(members(state)[0]).toMatchObject({ stays: 3, tier: "gold", lastStayDay: 7 });
    expect(state.loyalty.today.promoted).toEqual([{ name: "Membre 1", tier: "gold" }]);
  });

  it("reaches Platinum at the sixth stay", () => {
    const state = advance(withMembers([member(1, 5)]), [memberStay(50, "member:1", "2026-09-12", DATE)]);
    expect(members(state)[0]).toMatchObject({ stays: 6, tier: "platinum" });
  });

  it("a stay that does not change the tier promotes nobody", () => {
    const state = advance(withMembers([member(1, 3)]), [memberStay(50, "member:1", "2026-09-12", DATE)]);
    expect(state.loyalty.today.promoted).toEqual([]);
  });

  it("is never taken for a new member joining", () => {
    const state = advance(withMembers([member(1, 1)]), [memberStay(50, "member:1", "2026-09-12", DATE)]);
    expect(members(state)).toHaveLength(1);
    expect(state.loyalty.nextId).toBe(2);
  });

  it("a stay by an unknown member joins nobody and counts for nobody", () => {
    const state = advance(withMembers([member(1, 1)]), [memberStay(50, "member:99", "2026-09-12", DATE)]);
    expect(members(state)).toHaveLength(1);
    expect(members(state)[0].stays).toBe(1);
  });
});

describe("loyaltyProgramEngine / what the club does to demand", () => {
  const crowd = (silver, gold = 0, platinum = 0) => [
    ...Array.from({ length: silver }, (_, i) => member(i + 1, 1)),
    ...Array.from({ length: gold }, (_, i) => member(silver + i + 1, 3)),
    ...Array.from({ length: platinum }, (_, i) => member(silver + gold + i + 1, 6)),
  ];

  it("brings members back and steers a share of the bookings to direct, scaled by their satisfaction", () => {
    const effects = programEffects(withMembers(crowd(10)));
    expect(effects.active).toBe(true);
    expect(effects.engagement).toBeCloseTo(0.55, 10);
    expect(effects.returnBoost).toBeCloseTo(10 * RETURN_PER_WEIGHT * 0.55, 10);
    expect(effects.directShare).toBeCloseTo(10 * DIRECT_PER_WEIGHT * 0.55, 10);
    expect(effects.pool).toHaveLength(10);
  });

  it("Gold and Platinum weigh more than Silver", () => {
    const silver = programEffects(withMembers(crowd(10)));
    const mixed = programEffects(withMembers(crowd(0, 5, 5)));
    expect(mixed.returnBoost).toBeGreaterThan(silver.returnBoost);
    expect(mixed.directShare).toBeCloseTo((5 * 1.5 + 5 * 2) * DIRECT_PER_WEIGHT * 0.55, 10);
  });

  it("only Gold and Platinum members put up with higher prices", () => {
    expect(programEffects(withMembers(crowd(40))).priceRelief).toBe(0);
    const relief = programEffects(withMembers(crowd(0, 10, 10))).priceRelief;
    expect(relief).toBeCloseTo((10 * TIERS.gold.priceRelief + 10 * TIERS.platinum.priceRelief) * 0.55, 10);
    expect(relief).toBeGreaterThan(0);
  });

  it("the perks make all of it stronger", () => {
    const plain = programEffects(withMembers(crowd(10, 5)));
    const spoiled = programEffects(withPerks(withMembers(crowd(10, 5)), BENEFIT_IDS));
    expect(spoiled.returnBoost).toBeGreaterThan(plain.returnBoost);
    expect(spoiled.directShare).toBeGreaterThan(plain.directShare);
    expect(spoiled.priceRelief).toBeGreaterThan(plain.priceRelief);
  });

  it("is capped: +20 % of returns, half of the bookings, half of the price sensitivity", () => {
    const huge = programEffects(withPerks(withMembers(crowd(0, 0, 900)), BENEFIT_IDS));
    expect(huge.returnBoost).toBe(MAX_RETURN_BOOST);
    expect(huge.directShare).toBe(MAX_DIRECT_SHARE);
    expect(huge.priceRelief).toBe(MAX_PRICE_RELIEF);
    expect(loyaltyDemandFactor(withPerks(withMembers(crowd(0, 0, 900)), BENEFIT_IDS))).toBeCloseTo(1.2, 10);
  });
});

describe("loyaltyProgramEngine / what the perks cost", () => {
  const stays = [memberStay(1, "member:1", "2026-09-13", "2026-09-16"), memberStay(2, "member:2", "2026-09-13", "2026-09-16")];
  const state = (perks) => withPerks(withMembers([member(1, 1), member(2, 4)]), perks);

  it("costs nothing while no perk is granted", () => {
    expect(loyaltyCostOn(state([]), stays, DATE)).toBe(0);
  });

  it("charges the breakfast for each member in the hotel that night", () => {
    expect(loyaltyCostOn(state(["breakfast"]), stays, DATE)).toBe(2 * BENEFITS.breakfast.cost);
  });

  it("charges the Gold-and-up perks for the Gold member only", () => {
    expect(loyaltyCostOn(state(["lateCheckout"]), stays, DATE)).toBe(BENEFITS.lateCheckout.cost);
    expect(loyaltyCostOn(state(["breakfast", "upgrade"]), stays, DATE)).toBe(2 * BENEFITS.breakfast.cost + BENEFITS.upgrade.cost);
  });

  it("counts a member on the night they arrive, not the one they leave", () => {
    expect(loyaltyCostOn(state(["breakfast"]), stays, "2026-09-13")).toBe(2 * BENEFITS.breakfast.cost);
    expect(loyaltyCostOn(state(["breakfast"]), stays, "2026-09-16")).toBe(0);
    expect(loyaltyCostOn(state(["breakfast"]), stays, "2026-09-12")).toBe(0);
  });

  it("ignores guests who are not members, cancelled stays and unknown members", () => {
    const others = [stay(9, "2026-09-13", "2026-09-16"), memberStay(3, "member:1", "2026-09-13", "2026-09-16", { status: "annulée" }), memberStay(4, "member:77", "2026-09-13", "2026-09-16")];
    expect(loyaltyCostOn(state(["breakfast"]), others, DATE)).toBe(0);
  });
});

describe("loyaltyProgramEngine / the club's books", () => {
  const club = () => withPerks(withMembers([member(1, 1), member(2, 4)]), ["breakfast"]);

  it("books the perks of the members in the hotel, and the commission their direct bookings saved", () => {
    const stays = [
      memberStay(1, "member:1", "2026-09-13", "2026-09-16", { price: 200, metadata: { loyalty: { memberId: "member:1", saved: true } } }),
      memberStay(2, "member:2", "2026-09-13", "2026-09-16", { price: 100 }),
    ];
    const ledger = advance(club(), stays).loyalty.ledger;
    expect(ledger.cost).toBe(2 * BENEFITS.breakfast.cost);
    expect(ledger.savings).toBeCloseTo(200 * 0.18, 10);
    expect(ledger.memberNights).toBe(2);
  });

  it("counts the day's new bookings and those made by members", () => {
    const stays = [
      memberStay(1, "member:1", "2026-09-20", "2026-09-22", { created_at: `${DATE}T12:00:00.000Z` }),
      stay(2, "2026-09-20", "2026-09-22", { created_at: `${DATE}T12:00:00.000Z` }),
      stay(3, "2026-09-20", "2026-09-22", { created_at: "2026-09-01T12:00:00.000Z" }),
      stay(4, "2026-09-20", "2026-09-22", { created_at: `${DATE}T12:00:00.000Z`, source: "mice" }),
    ];
    const ledger = advance(club(), stays).loyalty.ledger;
    expect(ledger.bookings).toBe(2);
    expect(ledger.memberBookings).toBe(1);
  });

  it("adds up from day to day", () => {
    const stays = [memberStay(1, "member:1", "2026-09-13", "2026-09-17")];
    let state = advance(club(), stays, DATE);
    state = advance(state, stays, NEXT);
    expect(state.loyalty.ledger.cost).toBe(2 * BENEFITS.breakfast.cost);
    expect(state.loyalty.ledger.memberNights).toBe(2);
  });

  it("keeps a snapshot of the day for the review", () => {
    const state = advance(club(), [memberStay(1, "member:1", "2026-09-13", "2026-09-16")], DATE, 9);
    expect(state.loyalty.today).toMatchObject({ date: DATE, day: 9, joined: [], promoted: [], cost: BENEFITS.breakfast.cost, membersInHouse: 1 });
  });

  it("the club does nothing to a hotel with no reservations", () => {
    const state = advance(club(), []);
    expect(state.loyalty.ledger).toEqual({ cost: 0, savings: 0, memberBookings: 0, bookings: 0, memberNights: 0 });
  });
});

describe("loyaltyProgramEngine / the day's news", () => {
  it("announces the new members, the promotions and the members in the hotel", () => {
    const state = advance(withPerks(withMembers([member(1, 2), member(2, 1)]), ["breakfast"]), [
      memberStay(50, "member:1", "2026-09-12", DATE),
      memberStay(51, "member:2", "2026-09-12", "2026-09-16", { metadata: { loyalty: { memberId: "member:2", saved: true } }, price: 200 }),
    ]);
    const lines = loyaltyNewsOn(state, DATE);
    expect(lines.join("\n")).toContain("Membre 1 passe Gold au Club Hospitality.");
    expect(lines.join("\n")).toMatch(/membres? du club dans l'hôtel/);
    expect(lines.join("\n")).toMatch(/commission OTA évitée/);
    expect(lines.join("\n")).toMatch(/d'avantages offerts/);
  });

  it("says who joined", () => {
    const joiner = ids(1, 800).find((id) => (JOIN_CHANCE[rating(id)] || 0) > 0 && mixedRandom(`loyalty-join:${id}`) < JOIN_CHANCE[rating(id)] * 0.5);
    const state = advance(launched(), [stay(joiner, "2026-09-12", DATE)]);
    expect(loyaltyNewsOn(state, DATE)[0]).toMatch(/^1 nouveau membre au Club Hospitality : Client \d+\.$/);
  });

  it("is silent about another day", () => {
    const state = advance(launched(), [stay(1, "2026-09-12", DATE)]);
    expect(loyaltyNewsOn(state, NEXT)).toEqual([]);
  });
});

describe("loyaltyProgramEngine / how the interface reads it", () => {
  it("summarises the club", () => {
    const state = withPerks(withMembers([member(1, 1), member(2, 4), member(3, 8)]), ["breakfast", "upgrade"]);
    const described = describeProgram(state, { reservations: [memberStay(1, "member:1", DATE, NEXT), memberStay(2, "member:2", DATE, NEXT)], date: DATE });
    expect(described).toMatchObject({ launched: true, name: CLUB_NAME, members: { silver: 1, gold: 1, platinum: 1, total: 3 }, satisfaction: BASE_SATISFACTION + BENEFITS.breakfast.bonus + BENEFITS.upgrade.bonus });
    expect(described.costPerNight).toEqual({ silver: BENEFITS.breakfast.cost, gold: BENEFITS.breakfast.cost + BENEFITS.upgrade.cost, platinum: BENEFITS.breakfast.cost + BENEFITS.upgrade.cost });
    expect(described.tonight).toEqual({ members: 2, cost: BENEFITS.breakfast.cost + BENEFITS.breakfast.cost + BENEFITS.upgrade.cost });
  });

  it("lists every perk with its state and the tiers it applies to", () => {
    const perks = describeProgram(withPerks(launched(), ["drink"])).perks;
    expect(perks.map((perk) => perk.id)).toEqual(BENEFIT_IDS);
    expect(perks.find((perk) => perk.id === "drink")).toMatchObject({ enabled: true, appliesTo: ["silver", "gold", "platinum"] });
    expect(perks.find((perk) => perk.id === "upgrade")).toMatchObject({ enabled: false, appliesTo: ["gold", "platinum"] });
  });

  it("gives the effects in percent", () => {
    const { effects } = describeProgram(withMembers(Array.from({ length: 20 }, (_, i) => member(i + 1, 4))));
    expect(effects.returnPercent).toBe(Math.round(20 * 1.5 * RETURN_PER_WEIGHT * 0.55 * 100));
    expect(effects.directSharePercent).toBe(Math.round(20 * 1.5 * DIRECT_PER_WEIGHT * 0.55 * 100));
    expect(effects.priceReliefPercent).toBeGreaterThan(0);
  });

  it("gives the conversion to direct bookings, rounded", () => {
    const state = { ...launched(), loyalty: { ...launched().loyalty, ledger: { cost: 10.4, savings: 99.6, memberBookings: 1, bookings: 3, memberNights: 4 } } };
    expect(describeProgram(state).ledger).toEqual({ cost: 10, savings: 100, memberBookings: 1, bookings: 3, memberNights: 4, conversionPercent: 33 });
  });

  it("has a zero conversion before any booking", () => {
    expect(describeProgram(launched()).ledger.conversionPercent).toBe(0);
  });
});

describe("loyaltyProgramEngine / purity", () => {
  it("leaves its input alone", () => {
    const state = withPerks(withMembers([member(1, 2)]), ["breakfast"]);
    const frozen = JSON.stringify(state);
    advance(state, [memberStay(50, "member:1", "2026-09-12", DATE)]);
    setBenefit({ hotelState: state }, "drink", true);
    describeProgram(state, { reservations: [], date: DATE });
    expect(JSON.stringify(state)).toBe(frozen);
  });

  it("copes with junk", () => {
    expect(advance(launched(), undefined)).toBeTruthy();
    expect(describeProgram(undefined)).toMatchObject({ launched: false });
    expect(programEffects({ loyalty: "nope" }).active).toBe(false);
  });
});
