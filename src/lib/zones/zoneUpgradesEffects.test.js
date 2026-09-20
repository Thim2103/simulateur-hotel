import { priceFactor, computeDemand } from "../demand/demandEngine";
import { calculateReputation } from "../progression/reputation";
import { computeSatisfaction } from "../clients/clientsSatisfaction";
import { reconcileIncidents } from "../maintenance/incidentEngine";
import { calculateExpenses } from "../dailyCycle/calculateExpenses";
import { runHousekeepingCycle } from "../housekeeping/housekeepingEngine";
import { computeStaffing, createEmployee } from "../staff/staffRoster";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildDailyReview } from "../dashboard/dailyReview";
import { startUpgrade, advanceZoneUpgrades, computeZoneEffects } from "./zoneUpgradesEngine";
import { computeDailyMaintenance } from "../maintenance/maintenanceCostEngine";

const installed = (...ids) => ({ zoneUpgrades: { installed: Object.fromEntries(ids.map((id) => [id, { day: 1 }])), works: {}, completedLog: [] } });
const underWorks = (id) => ({ zoneUpgrades: { installed: {}, works: { [id]: { startedOnDay: 1, completesOnDay: 9 } }, completedLog: [] } });

describe("zone upgrades / demand: a higher standing lets prices rise without losing demand", () => {
  it("the same price is penalised less at a higher standing", () => {
    expect(priceFactor(1.2, 60, 0.2)).toBeGreaterThan(priceFactor(1.2, 60, 0));
  });

  it("standing shifts the price where demand starts to fall", () => {
    // At standing 0.2 the fair level is 20% higher: charging 20% above base costs nothing more than charging base did.
    expect(priceFactor(1.2, 60, 0.2)).toBeCloseTo(priceFactor(1, 60, 0), 5);
  });

  it("no standing (or a negative one) changes nothing", () => {
    expect(priceFactor(1.1, 60)).toBe(priceFactor(1.1, 60, 0));
    expect(priceFactor(1.1, 60, -0.5)).toBe(priceFactor(1.1, 60, 0));
  });

  it("computeDemand: a hotel with upgrades installed and prices raised keeps more of its demand than one without", () => {
    const rooms = [{ id: 1, price: 100 }];
    const reservations = [{ id: 1, room_id: 1, status: "confirmée", price: 120, departure: "2099-01-01" }]; // +20% over base
    const date = new Date("2026-07-15T12:00:00Z");
    const plain = computeDemand({ hotelState: {}, rooms, reservations, referenceDate: date });
    const upgraded = computeDemand({ hotelState: installed("rooms-bedding", "lobby-decor", "pool-build"), rooms, reservations, referenceDate: date });
    expect(upgraded.factors.price).toBeGreaterThan(plain.factors.price);
    expect(upgraded.multiplier).toBeGreaterThan(plain.multiplier);
  });
});

describe("zone upgrades / reputation, satisfaction", () => {
  const rep = (hotelState) => calculateReputation({ hotelState, restaurantState: {}, previousReputation: 50 });

  it("installed upgrades lift the reputation the hotel converges to", () => {
    expect(rep(installed("lobby-decor", "pool-build", "restaurant-signature"))).toBeGreaterThan(rep({}));
  });

  it("with no upgrades, reputation is exactly what it was", () => {
    expect(rep({ zoneUpgrades: { installed: {}, works: {}, completedLog: [] } })).toBe(rep({}));
  });

  it("satisfaction rises with the adjustment and falls when it is negative (works)", () => {
    const inputs = { housekeepingQuality: 70, staffMorale: 70 };
    expect(computeSatisfaction({ ...inputs, upgradeAdjustment: 5 })).toBe(computeSatisfaction(inputs) + 5);
    expect(computeSatisfaction({ ...inputs, upgradeAdjustment: -4 })).toBe(computeSatisfaction(inputs) - 4);
  });

  it("stays within 0..100", () => {
    expect(computeSatisfaction({ housekeepingQuality: 99, upgradeAdjustment: 50 })).toBeLessThanOrEqual(100);
    expect(computeSatisfaction({ housekeepingQuality: 1, upgradeAdjustment: -50 })).toBeGreaterThanOrEqual(0);
  });
});

describe("zone upgrades / incidents: a share of breakdowns never happens", () => {
  const diagnostics = Array.from({ length: 60 }, (_, i) => ({ type: "error", severity: "high", message: `Panne n°${i}` }));

  it("without upgrades every qualifying diagnostic becomes an incident", () => {
    expect(reconcileIncidents({}, diagnostics, 1).activeIncidents).toHaveLength(60);
  });

  it("industrial laundry equipment prevents roughly half of them", () => {
    const count = reconcileIncidents(installed("laundry-industrial"), diagnostics, 1).activeIncidents.length;
    expect(count).toBeGreaterThan(15);
    expect(count).toBeLessThan(45);
  });

  it("more upgrades prevent more", () => {
    const one = reconcileIncidents(installed("rooms-soundproofing"), diagnostics, 1).activeIncidents.length;
    const many = reconcileIncidents(installed("laundry-industrial", "laundry-preventive"), diagnostics, 1).activeIncidents.length;
    expect(many).toBeLessThan(one);
  });

  it("the decision is stable: the same diagnostic is prevented (or not) every day, never flickering", () => {
    const state = installed("laundry-industrial");
    const dayOne = reconcileIncidents(state, diagnostics, 1).activeIncidents.map((i) => i.id);
    const dayNine = reconcileIncidents(state, diagnostics, 9).activeIncidents.map((i) => i.id);
    expect(dayNine).toEqual(dayOne);
  });

  it("works in progress prevent nothing", () => {
    expect(reconcileIncidents(underWorks("laundry-industrial"), diagnostics, 1).activeIncidents).toHaveLength(60);
  });
});

describe("zone upgrades / running costs", () => {
  const expenses = (hotelState) => calculateExpenses({ hotelState: { finance: { payroll: 30000, fixedCosts: 3000 }, ...hotelState } });

  it("domotics and heat recovery cut the daily bill by their saving, net of their own upkeep", () => {
    const plain = expenses({});
    const state = installed("rooms-domotics", "laundry-heat");
    const upgraded = expenses(state);
    const upkeep = computeDailyMaintenance({ hotelState: state }).total;
    expect(upkeep).toBeGreaterThan(0);
    expect(plain.total - upgraded.total).toBe(25 + 20 - upkeep);
  });

  it("never drives expenses below zero", () => {
    expect(calculateExpenses({ hotelState: installed("rooms-domotics") }).total).toBe(0);
  });
});

describe("zone upgrades / housekeeping", () => {
  const cleaning = (hotelState) => {
    const bundle = {
      hotelState: { finance: { payroll: 38000 }, housekeeping: { staffingBonus: 0, trainingLevel: 50, processEfficiency: 50 }, ...hotelState },
      restaurantState: {},
      rooms: [{ id: 1, number: "101", status: "occupée", housekeeping_status: "dirty" }],
      reservations: [],
    };
    return runHousekeepingCycle({ hotelBundle: bundle, staffProductivity: 70, hotelHeadcount: 15, referenceDate: new Date("2026-09-10T12:00:00Z") });
  };

  it("industrial laundry equipment shortens the day's cleaning time", () => {
    expect(cleaning(installed("laundry-industrial")).cleaningTime.totalMinutes).toBeLessThan(cleaning({}).cleaningTime.totalMinutes);
  });

  it("works in the laundry lengthen it", () => {
    expect(cleaning(underWorks("laundry-industrial")).cleaningTime.totalMinutes).toBeGreaterThan(cleaning({}).cleaningTime.totalMinutes);
  });
});

describe("zone upgrades / reception capacity", () => {
  const roster = [createEmployee({ id: "r1", name: "Lina", role: "reception", level: "experienced" })];
  const coverage = (extra) => computeStaffing({ staffRoster: roster, ...extra }, { occupiedRooms: 25 }).receptionCoverage;

  it("a check-in kiosk lets each receptionist handle 40% more guests", () => {
    expect(coverage({})).toBeCloseTo(1);
    expect(coverage(installed("lobby-kiosk"))).toBeCloseTo(1.4);
  });

  it("lobby works cut it while they last", () => {
    expect(coverage(underWorks("lobby-kiosk"))).toBeCloseTo(0.7);
  });

  it("housekeeping capacity is unaffected by the kiosk", () => {
    const hk = [createEmployee({ id: "h1", name: "Ada", role: "housekeeping", level: "experienced" })];
    const cover = (extra) => computeStaffing({ staffRoster: hk, ...extra }, { occupiedRooms: 10 }).housekeepingCoverage;
    expect(cover(installed("lobby-kiosk"))).toBe(cover({}));
  });
});

describe("zone upgrades / through the career day", () => {
  function career() {
    const state = startCareer({
      playerId: "p",
      startDate: "2026-07-13",
      hotelState: { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {}, expansion: { availableCapital: 100000 } },
      restaurantState: {
        finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
        menu: [{ price: 20, cost: 8, sales: 10 }],
        staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
        operations: [],
        marketing: { budget: 0 },
        esg: {},
      },
      rooms: [{ id: 1, number: "101", type: "standard", price: 100, status: "libre", housekeeping_status: "clean" }],
      reservations: [],
    });
    return state;
  }

  it("works started on day 0 finish on the right day, install the upgrade, and are reported in that day's review", async () => {
    let state = career();
    state = { ...state, hotel: startUpgrade(state.hotel, "rooms-bedding", { day: state.day }) }; // 2 days
    expect(state.hotel.hotelState.expansion.availableCapital).toBe(100000 - 8000);

    ({ state } = await runCareerDay({ state, rng: () => 0.999 })); // day 1: still building
    expect(state.hotel.hotelState.zoneUpgrades.works["rooms-bedding"]).toBeDefined();
    expect(computeZoneEffects(state.hotel.hotelState).satisfactionPenalty).toBeGreaterThan(0);

    ({ state } = await runCareerDay({ state, rng: () => 0.999 })); // day 2: done
    expect(state.hotel.hotelState.zoneUpgrades.works["rooms-bedding"]).toBeUndefined();
    expect(state.hotel.hotelState.zoneUpgrades.installed["rooms-bedding"]).toEqual({ day: 2 });
    expect(computeZoneEffects(state.hotel.hotelState).standing).toBeGreaterThan(0);

    const review = buildDailyReview({ careerState: state, dashboardState: { kpis: { revenueToday: 0, profit: 0, satisfaction: 3, staffMorale: 50, occupancyRate: 0, date: "d" } } });
    expect(review.causalChain.some((line) => /Travaux terminés : Literie de luxe/.test(line))).toBe(true);
  });

  it("a career with no upgrades is completely unaffected", async () => {
    const { state } = await runCareerDay({ state: career(), rng: () => 0.999 });
    expect(state.hotel.hotelState.zoneUpgrades).toBeUndefined();
  });

  it("advanceZoneUpgrades leaves a hotel with no works untouched", () => {
    const state = { expansion: { availableCapital: 1 } };
    expect(advanceZoneUpgrades(state, 3)).toBe(state);
  });
});
