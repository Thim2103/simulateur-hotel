import { calculateExpenses } from "../dailyCycle/calculateExpenses";
import { updateFinance } from "../dailyCycle/updateFinance";
import { computeIncomeStatement } from "../finance/financeCalculations";
import { runFinanceCycle } from "../finance/financeEngine";
import { normalizeHotelFinance } from "../normalizers";
import { reconcileIncidents } from "./incidentEngine";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildDailyReview } from "../dashboard/dailyReview";
import { computeSatisfaction } from "../clients/clientsSatisfaction";
import { computeDailyMaintenance, setMaintenanceLevel, maintenanceSpent, maintenanceByCategory, hotelCondition, maintenanceLevel, WEAR_THRESHOLD } from "./maintenanceCostEngine";
import { startFloorConstruction, advanceExpansion, fitOutRooms, CONSTRUCTION_DAYS } from "../expansion/hotelExpansionEngine";

const rooms = [{ id: 1, type: "standard" }, { id: 2, type: "deluxe" }, { id: 3, type: "suite" }]; // 42 €
const finance = { payroll: 30000, fixedCosts: 3000 };

describe("maintenance / the day's expenses", () => {
  it("the upkeep bill is part of the day's expenses, fixed side, and reported on its own", () => {
    const without = calculateExpenses({ hotelState: { finance } });
    const withRooms = calculateExpenses({ hotelState: { finance }, rooms });
    expect(withRooms.maintenance.total).toBe(42);
    expect(withRooms.total - without.total).toBe(42);
    expect(withRooms.fixed - without.fixed).toBe(42);
    expect(withRooms.variable).toBe(without.variable);
  });

  it("no rooms given, no rooms billed (existing callers are unaffected)", () => {
    expect(calculateExpenses({ hotelState: { finance } }).maintenance.total).toBe(0);
  });

  it("the level changes the day's expenses", () => {
    const at = (level) => calculateExpenses({ hotelState: { finance, maintenance: { level } }, rooms }).total;
    expect(at("economy")).toBeLessThan(at("standard"));
    expect(at("premium")).toBeGreaterThan(at("standard"));
  });
});

describe("maintenance / the finance ledger", () => {
  const fold = (extra = {}, state = { finance: { revenue: [0], costs: [0], months: {} } }) =>
    updateFinance({ hotelState: state, restaurantState: { finance: { revenue: [0], costs: [0], months: {} } }, hotelRevenue: 1000, restaurantRevenue: 1000, referenceDate: new Date("2026-07-15T12:00:00Z"), ...extra });

  it("books the upkeep under its own line, aligned with the costs", () => {
    const { hotelFinance } = fold({ expenses: 500, maintenance: 100 });
    expect(hotelFinance.maintenance).toEqual([100]);
    expect(hotelFinance.costs).toEqual([200 + 100]); // hotel's half of the 400 shared + all 100 of upkeep
  });

  it("the upkeep is a hotel cost: the restaurant does not share it", () => {
    const { restaurantFinance } = fold({ expenses: 500, maintenance: 100 });
    expect(restaurantFinance.costs).toEqual([200]);
    expect(restaurantFinance.maintenance).toBeUndefined();
  });

  it("the whole expense still lands somewhere: hotel + restaurant = expenses", () => {
    const { hotelFinance, restaurantFinance } = fold({ expenses: 500, maintenance: 100 });
    expect(hotelFinance.costs[0] + restaurantFinance.costs[0]).toBe(500);
  });

  it("accumulates from one day to the next", () => {
    const first = fold({ expenses: 500, maintenance: 100 });
    const second = fold({ expenses: 500, maintenance: 60 }, { finance: first.hotelFinance });
    expect(second.hotelFinance.maintenance).toEqual([160]);
  });

  it("no upkeep, no extra line, and the split is unchanged", () => {
    const { hotelFinance, restaurantFinance } = fold({ expenses: 500 });
    expect(hotelFinance.maintenance).toBeUndefined();
    expect(hotelFinance.costs).toEqual([250]);
    expect(restaurantFinance.costs).toEqual([250]);
  });

  it("never books more upkeep than the expense itself", () => {
    expect(fold({ expenses: 50, maintenance: 100 }).hotelFinance.maintenance).toEqual([50]);
  });

  it("the ledger survives the hotel-state normalizer", () => {
    expect(normalizeHotelFinance({ costs: [10], revenue: [20], maintenance: [4] }).maintenance).toEqual([4]);
    expect(normalizeHotelFinance({ costs: [10], revenue: [20] })).not.toHaveProperty("maintenance");
  });
});

describe("maintenance / the income statement", () => {
  const statement = (hotelFinance, extra) => computeIncomeStatement({ hotelFinance, restaurantFinance: { revenue: [0], costs: [0] }, ...extra });

  it("shows the upkeep as its own line, taken out of the variable charges", () => {
    const { expenses } = statement({ revenue: [10000], costs: [4000], maintenance: [600], payroll: 1000, fixedCosts: 500 });
    expect(expenses).toMatchObject({ variable: 3400, maintenance: 600, payroll: 1000, fixed: 500 });
  });

  it("the total expenses do not change: the upkeep was already in the costs", () => {
    const withLine = statement({ revenue: [10000], costs: [4000], maintenance: [600], payroll: 1000, fixedCosts: 500 });
    const without = statement({ revenue: [10000], costs: [4000], payroll: 1000, fixedCosts: 500 });
    expect(withLine.expenses.total).toBe(without.expenses.total);
    expect(withLine.gop).toBe(without.gop);
    expect(withLine.ebitda).toBe(without.ebitda);
    expect(without.expenses.maintenance).toBe(0);
  });

  it("carries the breakdown by category when given", () => {
    const { expenses } = statement({ revenue: [1], costs: [1000], maintenance: [600] }, { maintenanceDetail: { rooms: 400, equipment: 100, floors: 100 } });
    expect(expenses.maintenanceDetail).toEqual({ rooms: 400, equipment: 100, floors: 100 });
  });

  it("the finance cycle reads the ledger and the breakdown from the hotel", () => {
    const hotelState = {
      finance: { revenue: [10000], costs: [4000], maintenance: [600], payroll: 1000, fixedCosts: 500, months: {} },
      maintenance: { level: "standard", condition: 80, ledger: { spent: 600, byCategory: { rooms: 400, equipment: 100, floors: 100 }, last: null } },
    };
    const state = runFinanceCycle({ hotelBundle: { hotelState, restaurantState: {}, rooms: [] } });
    expect(state.incomeStatement.expenses.maintenance).toBe(600);
    expect(state.incomeStatement.expenses.maintenanceDetail).toEqual({ rooms: 400, equipment: 100, floors: 100 });
  });

  it("a hotel with no upkeep has no breakdown", () => {
    const state = runFinanceCycle({ hotelBundle: { hotelState: { finance: { revenue: [10], costs: [1], months: {} } }, restaurantState: {}, rooms: [] } });
    expect(state.incomeStatement.expenses.maintenance).toBe(0);
    expect(state.incomeStatement.expenses).not.toHaveProperty("maintenanceDetail");
  });
});

describe("maintenance / neglect breaks things", () => {
  const neglected = { maintenance: { level: "economy", condition: 10 } };
  const openWear = (state) => state.activeIncidents.filter((incident) => incident.origin === "wear");

  it("a well-kept hotel gets no wear breakdown", () => {
    for (let day = 1; day < 80; day += 1) expect(reconcileIncidents({ maintenance: { level: "standard", condition: 80 } }, [], day).activeIncidents).toEqual([]);
  });

  it("a neglected hotel gets wear incidents, marked as such, with a repair cost like any other", () => {
    let state = neglected;
    for (let day = 1; day < 40; day += 1) state = reconcileIncidents(state, [], day);
    const wear = openWear(state);
    expect(wear.length).toBeGreaterThan(0);
    expect(wear[0]).toMatchObject({ status: "active", severity: "critical", repairCost: 1200, origin: "wear" });
    expect(wear[0].message).toMatch(/usure/i);
  });

  it("never more than three unresolved at once, however long the neglect", () => {
    let state = neglected;
    for (let day = 1; day < 200; day += 1) state = reconcileIncidents(state, [], day);
    expect(openWear(state)).toHaveLength(3);
  });

  it("resolving them lets new ones come", () => {
    let state = neglected;
    for (let day = 1; day < 60; day += 1) state = reconcileIncidents(state, [], day);
    const before = openWear(state).length;
    state = { ...state, activeIncidents: state.activeIncidents.map((incident) => ({ ...incident, status: "resolved" })) };
    for (let day = 60; day < 120; day += 1) state = reconcileIncidents(state, [], day);
    expect(state.activeIncidents.filter((incident) => incident.status !== "resolved").length).toBeGreaterThan(0);
    expect(before).toBe(3);
  });

  it("is deterministic: the same days give the same incidents", () => {
    const run = () => {
      let state = neglected;
      for (let day = 1; day < 40; day += 1) state = reconcileIncidents(state, [], day);
      return state.activeIncidents.map((incident) => incident.id);
    };
    expect(run()).toEqual(run());
  });

  it("Premium prevents a share of the ordinary breakdowns too", () => {
    const diagnostics = Array.from({ length: 80 }, (_, i) => ({ type: "error", severity: "high", message: `Panne n°${i}` }));
    const standard = reconcileIncidents({}, diagnostics, 1).activeIncidents.length;
    const premium = reconcileIncidents({ maintenance: { level: "premium", condition: 90 } }, diagnostics, 1).activeIncidents.length;
    expect(standard).toBe(80);
    expect(premium).toBeLessThan(standard);
    expect(premium).toBeGreaterThan(50);
  });
});

describe("maintenance / satisfaction", () => {
  it("a run-down hotel lowers the guests' satisfaction by the same signed adjustment", () => {
    const inputs = { housekeepingQuality: 70, staffMorale: 70 };
    expect(computeSatisfaction({ ...inputs, upgradeAdjustment: -4 })).toBe(computeSatisfaction(inputs) - 4);
  });
});

describe("maintenance / through the career day", () => {
  function career(capital = 900000) {
    return startCareer({
      playerId: "p",
      startDate: "2026-07-13",
      hotelState: { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000 }, marketing: { budget: 0 }, esg: {}, expansion: { availableCapital: capital } },
      restaurantState: {
        finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
        menu: [{ price: 20, cost: 8, sales: 10 }],
        staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
        operations: [],
        marketing: { budget: 0 },
        esg: {},
      },
      rooms: [
        { id: 1, number: "101", type: "standard", price: 100, status: "libre", housekeeping_status: "clean" },
        { id: 2, number: "102", type: "suite", price: 300, status: "libre", housekeeping_status: "clean" },
      ],
      reservations: [],
    });
  }
  const play = async (state, days) => {
    let current = state;
    for (let i = 0; i < days; i += 1) ({ state: current } = await runCareerDay({ state: current, rng: () => 0.999 }));
    return current;
  };
  const dashboard = { kpis: { revenueToday: 0, profit: 0, satisfaction: 3, staffMorale: 50, occupancyRate: 0, date: "d" } };

  it("a day played bills the rooms, records the ledger and reports the breakdown", async () => {
    const state = await play(career(), 1);
    const hotelState = state.hotel.hotelState;
    expect(maintenanceSpent(hotelState)).toBe(5 + 25);
    expect(maintenanceByCategory(hotelState)).toMatchObject({ rooms: 30, equipment: 0, floors: 0 });
    expect(hotelState.finance.maintenance).toEqual([30]);
    expect(state.lastDayReport.expenses.maintenance.total).toBe(30);
  });

  it("the ledger grows day after day", async () => {
    const state = await play(career(), 3);
    expect(maintenanceSpent(state.hotel.hotelState)).toBe(90);
    expect(state.hotel.hotelState.finance.maintenance).toEqual([90]);
  });

  it("the day's review shows the bill and the condition", async () => {
    const state = await play(career(), 1);
    const review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    expect(review.maintenance).toMatchObject({ day: state.day, rooms: 30, total: 30, level: "standard", condition: 80 });
  });

  it("expansion makes the bill grow: new rooms and a built floor cost more every day", async () => {
    let state = career();
    const before = computeDailyMaintenance({ hotelState: state.hotel.hotelState, rooms: state.hotel.rooms }).total;
    state = { ...state, hotel: startFloorConstruction(state.hotel, { day: state.day }) };
    state = await play(state, CONSTRUCTION_DAYS);
    state = { ...state, hotel: fitOutRooms(state.hotel, 5, "suite", 2) };
    const after = computeDailyMaintenance({ hotelState: state.hotel.hotelState, rooms: state.hotel.rooms });
    expect(after.floors).toBeGreaterThan(0);
    expect(after.rooms).toBe(before + 50);
    expect(after.total).toBeGreaterThan(before + 50);
  });

  it("Économique is cheaper but wears the hotel down; Premium costs more but keeps it up", async () => {
    const run = async (level) => {
      let state = career();
      state = { ...state, hotel: setMaintenanceLevel(state.hotel, level) };
      return play(state, 10);
    };
    const economy = await run("economy");
    const premium = await run("premium");
    expect(maintenanceLevel(economy.hotel.hotelState)).toBe("economy");
    expect(maintenanceSpent(economy.hotel.hotelState)).toBeLessThan(maintenanceSpent(premium.hotel.hotelState));
    expect(hotelCondition(economy.hotel.hotelState)).toBeLessThan(80);
    expect(hotelCondition(premium.hotel.hotelState)).toBeGreaterThan(80);
  });

  it("a long neglect ends with a warning in the review and wear incidents", async () => {
    let state = career();
    state = { ...state, hotel: setMaintenanceLevel({ ...state.hotel, hotelState: { ...state.hotel.hotelState, maintenance: { level: "economy", condition: WEAR_THRESHOLD, ledger: undefined } } }, "economy") };
    state = await play(state, 25);
    expect(hotelCondition(state.hotel.hotelState)).toBeLessThan(WEAR_THRESHOLD);
    const review = buildDailyReview({ careerState: state, dashboardState: dashboard });
    expect(review.causalChain.some((line) => /mauvais état/.test(line))).toBe(true);
  });
});
