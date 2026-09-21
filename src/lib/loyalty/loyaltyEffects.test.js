import { computeDemand, generateBookings, applyDemand, PRICE_ELASTICITY } from "../demand/demandEngine";
import { calculateExpenses } from "../dailyCycle/calculateExpenses";
import { calculateHotelRevenue } from "../dailyCycle/calculateHotelRevenue";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildDailyReview } from "../dashboard/dailyReview";
import { launchProgram, setBenefit, describeProgram, programEffects, BENEFITS, TIERS } from "./loyaltyProgramEngine";

const D = (text) => new Date(`${text}T12:00:00Z`);
const APR = D("2026-04-15"); // a shoulder-season Wednesday: neutral season
const rooms = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, number: String(100 + i), type: "standard", status: "libre", price: 120, capacity: 2, housekeeping_status: "clean" }));

const hotel = (extra = {}) => ({ finance: { revenue: [50000], costs: [0] }, progression: { player: { reputation: 60 } }, ...extra });
const member = (n, stays = 1) => ({ id: `member:${n}`, name: `Membre ${n}`, stays, joinedDay: 0, lastStayDay: 0, tier: stays >= 6 ? "platinum" : stays >= 3 ? "gold" : "silver" });
function club(list, perks = [], extra = {}) {
  const launched = launchProgram({ hotelState: hotel(extra) }, { day: 0 }).hotelState;
  return { ...launched, loyalty: { ...launched.loyalty, members: list, nextId: list.length + 1, benefits: Object.fromEntries(perks.map((id) => [id, true])) } };
}
const crowd = (silver, gold = 0, platinum = 0) => [
  ...Array.from({ length: silver }, (_, i) => member(i + 1, 1)),
  ...Array.from({ length: gold }, (_, i) => member(silver + i + 1, 3)),
  ...Array.from({ length: platinum }, (_, i) => member(silver + gold + i + 1, 6)),
];
const demand = (hotelState, reservations = []) => computeDemand({ hotelState, rooms, reservations, referenceDate: APR });

describe("loyalty / demand", () => {
  it("adds no factor, and no plan, without a club", () => {
    const result = demand(hotel());
    expect(Object.keys(result.factors).sort()).toEqual(["events", "incidents", "marketing", "price", "reputation", "season"]);
    expect(result).not.toHaveProperty("loyalty");
  });

  it("nor with a club that has no member yet", () => {
    expect(demand(club([])).factors).not.toHaveProperty("loyalty");
  });

  it("lists a `loyalty` factor for the members coming back, and hands the booking plan on", () => {
    const state = club(crowd(20));
    const result = demand(state);
    const effects = programEffects(state);
    expect(result.factors.loyalty).toBeCloseTo(1 + effects.returnBoost, 10);
    expect(result.loyalty.share).toBeCloseTo(effects.directShare, 10);
    expect(result.loyalty.members).toHaveLength(20);
  });

  it("raises the demand by that factor, all else being equal", () => {
    const calm = demand(hotel());
    const withClub = demand(club(crowd(20)));
    expect(withClub.multiplier / calm.multiplier).toBeCloseTo(withClub.factors.loyalty, 8);
  });

  it("the perks make members come back more", () => {
    expect(demand(club(crowd(20), ["breakfast", "drink", "lateCheckout", "upgrade"])).factors.loyalty).toBeGreaterThan(demand(club(crowd(20))).factors.loyalty);
  });

  describe("price sensitivity", () => {
    // Prices 40 % above the base rates: a punishing price factor.
    const dear = [{ id: 1, room_id: 1, status: "confirmée", price: 168, departure: "2027-12-31" }];
    const price = (state) => demand(state, dear).factors.price;

    it("bites less when Gold and Platinum members are around, and only then", () => {
      const bare = price(hotel());
      expect(bare).toBeLessThan(1);
      expect(price(club(crowd(0, 15, 15)))).toBeGreaterThan(bare);
      expect(price(club(crowd(0, 15, 15)))).toBeLessThanOrEqual(1);
    });

    it("Silver members change nothing", () => {
      expect(price(club(crowd(60)))).toBe(price(hotel()));
    });

    it("relieves exactly its share of the penalty", () => {
      const bare = price(hotel());
      const relief = programEffects(club(crowd(0, 15, 15))).priceRelief;
      expect(price(club(crowd(0, 15, 15)))).toBeCloseTo(1 - (1 - bare) * (1 - relief), 10);
      expect(PRICE_ELASTICITY).toBe(0.8);
    });

    it("leaves a price factor above 1 alone", () => {
      const cheap = [{ id: 1, room_id: 1, status: "confirmée", price: 90, departure: "2027-12-31" }];
      expect(demand(club(crowd(0, 15, 15)), cheap).factors.price).toBe(demand(hotel(), cheap).factors.price);
    });
  });
});

describe("loyalty / the bookings", () => {
  const pool = crowd(6).map(({ id, name }) => ({ id, name }));
  const book = (loyalty) => generateBookings({ rooms, reservations: [], referenceDate: APR, multiplier: 3, loyalty });
  const byMembers = (result) => result.reservations.filter((reservation) => reservation.metadata?.loyalty);

  it("without a club, every booking is an ordinary one", () => {
    expect(byMembers(book(null))).toHaveLength(0);
    expect(byMembers(book({ share: 0, members: pool }))).toHaveLength(0);
    expect(byMembers(book({ share: 0.5, members: [] }))).toHaveLength(0);
  });

  it("a share of the bookings are members booking direct, under their own name", () => {
    const result = book({ share: 0.5, members: pool });
    const members = byMembers(result);
    expect(result.reservations.length).toBeGreaterThan(40);
    expect(members.length / result.reservations.length).toBeGreaterThan(0.35);
    expect(members.length / result.reservations.length).toBeLessThan(0.65);
    members.forEach((reservation) => {
      expect(reservation.source).toBe("direct");
      expect(pool.map((item) => item.id)).toContain(reservation.metadata.loyalty.memberId);
      expect(reservation.client_name).toBe(pool.find((item) => item.id === reservation.metadata.loyalty.memberId).name);
    });
  });

  it("takes them in turn from the whole club", () => {
    const all = byMembers(book({ share: 1, members: pool }));
    expect(all).toHaveLength(book(null).reservations.length);
    expect(new Set(all.map((reservation) => reservation.metadata.loyalty.memberId)).size).toBeGreaterThan(2);
  });

  it("marks as saved the commission of those who would otherwise have gone through an OTA", () => {
    const members = byMembers(book({ share: 1, members: pool }));
    const saved = members.filter((reservation) => reservation.metadata.loyalty.saved);
    expect(saved.length).toBeGreaterThan(0);
    expect(saved.length).toBeLessThan(members.length);
  });

  it("the more members, the fewer OTA bookings", () => {
    const ota = (result) => result.reservations.filter((reservation) => reservation.source === "ota").length;
    expect(ota(book({ share: 0.5, members: pool }))).toBeLessThan(ota(book(null)));
  });

  it("the daily demand passes the plan on to the bookings", () => {
    const state = club(crowd(30));
    const result = applyDemand({ hotelState: state, rooms, reservations: [], referenceDate: APR });
    expect(result.reservations.length).toBeGreaterThan(10);
    expect(byMembers(result).length).toBeGreaterThan(0);
  });

  it("a direct member booking pays no OTA commission", () => {
    const stay = { room_id: 1, arrival: "2026-04-15", departure: "2026-04-17", status: "confirmée", price: 200 };
    const ota = calculateHotelRevenue({ reservations: [{ ...stay, id: 1, source: "ota" }], referenceDate: APR });
    const direct = calculateHotelRevenue({ reservations: [{ ...stay, id: 1, source: "direct" }], referenceDate: APR });
    expect(ota.otaCommission).toBe(36);
    expect(direct.otaCommission).toBe(0);
    expect(direct.netRevenue - ota.netRevenue).toBe(36);
  });
});

describe("loyalty / the expenses", () => {
  const expenses = (extra) => calculateExpenses({ hotelState: {}, restaurantState: {}, events: [], rooms, referenceDate: APR, ...extra });

  it("adds the perks to the day's variable costs and total", () => {
    const plain = expenses({});
    const perks = expenses({ loyaltyCost: 84 });
    expect(perks.variable - plain.variable).toBe(84);
    expect(perks.total - plain.total).toBe(84);
    expect(perks.loyalty).toBe(84);
  });

  it("shows no such line without a club", () => {
    expect(expenses({})).not.toHaveProperty("loyalty");
    expect(expenses({ loyaltyCost: 0 })).not.toHaveProperty("loyalty");
  });
});

describe("loyalty / through the career day", () => {
  const stayOf = (extra) => ({ id: 900, room_id: 1, room: "101", room_type: "standard", client_name: "Membre 1", arrival: "2026-04-14", departure: "2026-04-17", status: "confirmée", price: 200, source: "direct", segment: "leisure", ...extra });
  function career(hotelExtra, reservations) {
    return startCareer({
      playerId: "p",
      startDate: "2026-04-15",
      hotelState: { finance: { revenue: [100000], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {}, ...hotelExtra },
      restaurantState: {
        finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
        menu: [{ price: 20, cost: 8, sales: 10 }],
        staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
        operations: [],
        marketing: { budget: 0 },
        esg: {},
      },
      rooms,
      reservations,
    });
  }
  const loyalty = (perks = ["breakfast"]) => {
    const state = club([member(1, 1)], perks);
    return { loyalty: state.loyalty };
  };
  const memberStay = (saved) => stayOf({ metadata: { loyalty: { memberId: "member:1", saved } } });

  it("a hotel without a club has no club state after a day", async () => {
    const { state } = await runCareerDay({ state: career({}, [stayOf({})]), rng: () => 0.999 });
    expect(state.hotel.hotelState.loyalty).toBeUndefined();
    expect(state.lastDayReport.expenses).not.toHaveProperty("loyalty");
  });

  it("the perks of a member in the hotel are charged to the day, and booked in the club's ledger", async () => {
    const { state } = await runCareerDay({ state: career(loyalty(), [memberStay(false)]), rng: () => 0.999 });
    expect(state.lastDayReport.expenses.loyalty).toBe(BENEFITS.breakfast.cost);
    expect(state.hotel.hotelState.loyalty.ledger).toMatchObject({ cost: BENEFITS.breakfast.cost, memberNights: 1 });
  });

  it("without perks there is nothing to pay, but the member is counted all the same", async () => {
    const { state } = await runCareerDay({ state: career(loyalty([]), [memberStay(false)]), rng: () => 0.999 });
    expect(state.lastDayReport.expenses).not.toHaveProperty("loyalty");
    expect(state.hotel.hotelState.loyalty.ledger.memberNights).toBe(1);
  });

  it("the commission saved by a direct member booking is tallied", async () => {
    const { state } = await runCareerDay({ state: career(loyalty([]), [memberStay(true)]), rng: () => 0.999 });
    expect(state.hotel.hotelState.loyalty.ledger.savings).toBeCloseTo(200 * 0.18, 8);
    expect(describeProgram(state.hotel.hotelState).ledger.savings).toBe(36);
  });

  it("a member who leaves that day is counted, and the daily review tells the player about the club", async () => {
    const departing = stayOf({ departure: "2026-04-15", metadata: { loyalty: { memberId: "member:1", saved: false } } });
    const { state } = await runCareerDay({ state: career(loyalty(), [departing, memberStay(false)].map((r, i) => ({ ...r, id: 900 + i, room_id: i + 1 }))), rng: () => 0.999 });
    expect(state.hotel.hotelState.loyalty.members[0].stays).toBe(2);
    const review = buildDailyReview({ careerState: state, dashboardState: { kpis: { revenueToday: 0, profit: 0, satisfaction: 3, staffMorale: 50, occupancyRate: 0, date: "d" } } });
    expect(review.causalChain.join("\n")).toMatch(/membres? du club dans l'hôtel/);
  });

  it("over several days the club steers bookings to direct and saves commission, and its members climb", async () => {
    const play = async (hotelExtra) => {
      let current = career(hotelExtra, []);
      let commission = 0;
      for (let i = 0; i < 6; i += 1) {
        ({ state: current } = await runCareerDay({ state: current, rng: () => 0.999 }));
        commission += current.lastDayReport.hotelRevenue.otaCommission;
      }
      return { current, commission };
    };
    const base = await play({});
    const withClub = await play({ loyalty: club(crowd(30, 10), ["breakfast"]).loyalty });
    expect(withClub.current.hotelState ?? withClub.current.hotel.hotelState).toBeTruthy();
    expect(withClub.current.hotel.hotelState.loyalty.ledger.memberBookings).toBeGreaterThan(0);
    // More bookings come in with the club, but fewer of them through an OTA.
    const otaShare = ({ current }) => current.hotel.reservations.filter((reservation) => reservation.source === "ota").length / current.hotel.reservations.length;
    expect(otaShare(withClub)).toBeLessThan(otaShare(base));
    expect(withClub.current.hotel.hotelState.loyalty.ledger.savings).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic", async () => {
    const run = () => runCareerDay({ state: career(loyalty(), [memberStay(true)]), rng: () => 0.999 });
    const [a, b] = await Promise.all([run(), run()]);
    expect(a.state.hotel.hotelState.loyalty).toEqual(b.state.hotel.hotelState.loyalty);
  });

  it("setting a perk before playing is what is charged", async () => {
    const bundle = setBenefit({ hotelState: { ...club([member(1, 1)]) } }, "drink", true);
    const { state } = await runCareerDay({ state: career({ loyalty: bundle.hotelState.loyalty }, [memberStay(false)]), rng: () => 0.999 });
    expect(state.lastDayReport.expenses.loyalty).toBe(BENEFITS.drink.cost);
    expect(TIERS.silver.label).toBe("Silver");
  });
});
