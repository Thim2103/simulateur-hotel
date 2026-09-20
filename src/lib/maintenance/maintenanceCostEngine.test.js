import {
  LEVELS,
  ROOM_DAILY_COST,
  DEFAULT_ROOM_DAILY_COST,
  FLOOR_DAILY_COST,
  EQUIPMENT_UPKEEP_RATE,
  DEFAULT_CONDITION,
  WEAR_THRESHOLD,
  MAX_WEAR_INCIDENTS,
  maintenanceLevel,
  hotelCondition,
  maintenanceSpent,
  maintenanceByCategory,
  computeDailyMaintenance,
  setMaintenanceLevel,
  recordMaintenance,
  maintenanceOn,
  maintenanceIncidentMultiplier,
  maintenanceSatisfactionAdjustment,
  wearChance,
  wearBreakdown,
} from "./maintenanceCostEngine";
import { UPGRADES } from "../zones/zoneUpgradesEngine";

const rooms = [{ type: "standard" }, { type: "standard" }, { type: "deluxe" }, { type: "suite" }]; // 5 + 5 + 12 + 25 = 47 €
const installed = (...ids) => ({ zoneUpgrades: { installed: Object.fromEntries(ids.map((id) => [id, { day: 1 }])), works: {}, completedLog: [] } });
const builtFloor = (level) => ({ buildingExpansion: { floors: { [level]: { status: "built", startedOnDay: 0, completesOnDay: 5, builtOnDay: 5 } }, completedLog: [] } });
const at = (level, condition = DEFAULT_CONDITION) => ({ maintenance: { level, condition } });

describe("maintenanceCostEngine / defaults", () => {
  it("an untouched hotel is at the Standard level, in the default condition", () => {
    expect(maintenanceLevel({})).toBe("standard");
    expect(hotelCondition({})).toBe(DEFAULT_CONDITION);
    expect(maintenanceSpent({})).toBe(0);
    expect(maintenanceLevel(undefined)).toBe("standard");
  });

  it("an unknown stored level falls back to Standard", () => {
    expect(maintenanceLevel({ maintenance: { level: "luxe" } })).toBe("standard");
  });

  it("has three levels, from cheapest to dearest", () => {
    expect(Object.keys(LEVELS)).toEqual(["economy", "standard", "premium"]);
    expect(LEVELS.economy.costMultiplier).toBeLessThan(LEVELS.standard.costMultiplier);
    expect(LEVELS.standard.costMultiplier).toBeLessThan(LEVELS.premium.costMultiplier);
  });
});

describe("maintenanceCostEngine / the daily bill", () => {
  it("costs nothing for a hotel with no rooms, floors or equipment", () => {
    expect(computeDailyMaintenance({ hotelState: {}, rooms: [] })).toMatchObject({ rooms: 0, equipment: 0, floors: 0, total: 0 });
  });

  it("charges each room by its type: 5 / 12 / 25 € a day", () => {
    expect(ROOM_DAILY_COST).toMatchObject({ standard: 5, deluxe: 12, suite: 25 });
    expect(computeDailyMaintenance({ hotelState: {}, rooms }).rooms).toBe(47);
  });

  it("charges an unknown room type the default rate", () => {
    expect(computeDailyMaintenance({ hotelState: {}, rooms: [{ type: "loft" }] }).rooms).toBe(DEFAULT_ROOM_DAILY_COST);
  });

  it("charges each installed upgrade a small daily upkeep proportional to what it cost", () => {
    const bill = computeDailyMaintenance({ hotelState: installed("pool-build", "rooms-domotics"), rooms: [] });
    expect(bill.equipment).toBe(Math.round((UPGRADES["pool-build"].cost + UPGRADES["rooms-domotics"].cost) * EQUIPMENT_UPKEEP_RATE));
    expect(bill.equipment).toBeGreaterThan(0);
  });

  it("works in progress cost no upkeep yet", () => {
    const state = { zoneUpgrades: { installed: {}, works: { "pool-build": { startedOnDay: 1, completesOnDay: 4 } }, completedLog: [] } };
    expect(computeDailyMaintenance({ hotelState: state, rooms: [] }).equipment).toBe(0);
  });

  it("charges each built expansion floor, not one still under construction", () => {
    expect(computeDailyMaintenance({ hotelState: builtFloor(5), rooms: [] }).floors).toBe(FLOOR_DAILY_COST);
    const building = { buildingExpansion: { floors: { 5: { status: "building", startedOnDay: 0, completesOnDay: 5 } }, completedLog: [] } };
    expect(computeDailyMaintenance({ hotelState: building, rooms: [] }).floors).toBe(0);
  });

  it("the total is the sum of the parts", () => {
    const bill = computeDailyMaintenance({ hotelState: { ...installed("pool-build"), ...builtFloor(5) }, rooms });
    expect(bill.total).toBe(bill.rooms + bill.equipment + bill.floors);
  });

  it("the level scales the whole bill: Économique cheaper, Premium dearer", () => {
    const standard = computeDailyMaintenance({ hotelState: {}, rooms }).total;
    const economy = computeDailyMaintenance({ hotelState: at("economy"), rooms }).total;
    const premium = computeDailyMaintenance({ hotelState: at("premium"), rooms }).total;
    expect(economy).toBeLessThan(standard);
    expect(premium).toBeGreaterThan(standard);
    expect(economy).toBe(Math.round(47 * LEVELS.economy.costMultiplier));
    expect(premium).toBe(Math.round(47 * LEVELS.premium.costMultiplier));
  });

  it("copes with missing input", () => {
    expect(computeDailyMaintenance().total).toBe(0);
    expect(computeDailyMaintenance({ rooms: [null, undefined, {}] }).total).toBe(3 * DEFAULT_ROOM_DAILY_COST);
  });
});

describe("maintenanceCostEngine / choosing a level", () => {
  const bundle = { hotelState: { finance: { costs: [1] } }, rooms };

  it("sets the level without touching anything else", () => {
    const next = setMaintenanceLevel(bundle, "premium");
    expect(maintenanceLevel(next.hotelState)).toBe("premium");
    expect(next.hotelState.finance).toBe(bundle.hotelState.finance);
    expect(next.rooms).toBe(rooms);
  });

  it("keeps the condition and the ledger when switching", () => {
    const start = { hotelState: { maintenance: { level: "economy", condition: 42, ledger: { spent: 900, byCategory: { rooms: 900 }, last: null } } } };
    const next = setMaintenanceLevel(start, "premium");
    expect(hotelCondition(next.hotelState)).toBe(42);
    expect(maintenanceSpent(next.hotelState)).toBe(900);
  });

  it("an unknown level changes nothing", () => {
    expect(setMaintenanceLevel(bundle, "luxe")).toBe(bundle);
  });

  it("choosing the level already in force changes nothing", () => {
    const set = setMaintenanceLevel(bundle, "premium");
    expect(setMaintenanceLevel(set, "premium")).toBe(set);
  });

  it("does not mutate its input", () => {
    const snapshot = JSON.stringify(bundle);
    setMaintenanceLevel(bundle, "economy");
    expect(JSON.stringify(bundle)).toBe(snapshot);
  });
});

describe("maintenanceCostEngine / recording a day", () => {
  const bill = { rooms: 47, equipment: 60, floors: 40, total: 147 };

  it("adds the bill to the ledger, by category, and keeps the last day for the review", () => {
    let state = recordMaintenance({}, bill, 1);
    state = recordMaintenance(state, bill, 2);
    expect(maintenanceSpent(state)).toBe(294);
    expect(maintenanceByCategory(state)).toEqual({ rooms: 94, equipment: 120, floors: 80 });
    expect(maintenanceOn(state, 2)).toMatchObject({ day: 2, rooms: 47, equipment: 60, floors: 40, total: 147, level: "standard", condition: 80 });
    expect(maintenanceOn(state, 1)).toBeNull();
  });

  it("is a no-op (same object) for a hotel with no bill, no drift and no state", () => {
    const state = { finance: {} };
    expect(recordMaintenance(state, { total: 0 }, 1)).toBe(state);
    expect(recordMaintenance(state, undefined, 1)).toBe(state);
  });

  it("the condition holds at Standard", () => {
    expect(hotelCondition(recordMaintenance(at("standard"), bill, 1))).toBe(80);
  });

  it("the condition falls every day at Économique, down to 0 and no further", () => {
    let state = at("economy", 80);
    state = recordMaintenance(state, bill, 1);
    expect(hotelCondition(state)).toBe(80 + LEVELS.economy.conditionDrift);
    for (let day = 2; day < 200; day += 1) state = recordMaintenance(state, bill, day);
    expect(hotelCondition(state)).toBe(0);
  });

  it("the condition climbs back at Premium, up to 100 and no further", () => {
    let state = at("premium", 50);
    state = recordMaintenance(state, bill, 1);
    expect(hotelCondition(state)).toBe(50 + LEVELS.premium.conditionDrift);
    for (let day = 2; day < 200; day += 1) state = recordMaintenance(state, bill, day);
    expect(hotelCondition(state)).toBe(100);
  });

  it("wears even when nothing is billed, once the player chose Économique", () => {
    expect(hotelCondition(recordMaintenance(at("economy"), { total: 0 }, 1))).toBeLessThan(80);
  });

  it("does not mutate its input", () => {
    const state = at("economy");
    const snapshot = JSON.stringify(state);
    recordMaintenance(state, bill, 1);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe("maintenanceCostEngine / effects", () => {
  it("Premium prevents 15 % of breakdowns, the others none", () => {
    expect(maintenanceIncidentMultiplier(at("premium"))).toBeCloseTo(0.85);
    expect(maintenanceIncidentMultiplier(at("standard"))).toBe(1);
    expect(maintenanceIncidentMultiplier(at("economy"))).toBe(1);
    expect(maintenanceIncidentMultiplier({})).toBe(1);
  });

  it("guests notice a run-down hotel, in proportion", () => {
    expect(maintenanceSatisfactionAdjustment(at("economy", 50))).toBeCloseTo(-1);
    expect(maintenanceSatisfactionAdjustment(at("economy", 20))).toBeCloseTo(-4);
    expect(maintenanceSatisfactionAdjustment(at("economy", 0))).toBeCloseTo(-6);
  });

  it("no effect in the normal range, a small bonus for a hotel in great shape", () => {
    expect(maintenanceSatisfactionAdjustment(at("standard", WEAR_THRESHOLD))).toBe(0);
    expect(maintenanceSatisfactionAdjustment(at("standard", 80))).toBe(0);
    expect(maintenanceSatisfactionAdjustment(at("premium", 95))).toBe(1);
  });

  it("no effect at all on a hotel with no maintenance state", () => {
    expect(maintenanceSatisfactionAdjustment({})).toBe(0);
    expect(maintenanceSatisfactionAdjustment(undefined)).toBe(0);
  });
});

describe("maintenanceCostEngine / wear breakdowns", () => {
  it("none while the hotel is in good condition", () => {
    expect(wearChance(at("standard", 80))).toBe(0);
    expect(wearChance(at("economy", WEAR_THRESHOLD))).toBe(0);
    for (let day = 1; day < 60; day += 1) expect(wearBreakdown(at("standard", 80), day)).toBeNull();
  });

  it("the chance grows as the condition falls, and is capped", () => {
    expect(wearChance(at("economy", 40))).toBeCloseTo(0.2);
    expect(wearChance(at("economy", 20))).toBeGreaterThan(wearChance(at("economy", 40)));
    expect(wearChance(at("economy", 0))).toBeLessThanOrEqual(0.5);
  });

  it("a neglected hotel breaks down now and then, never every day", () => {
    const state = at("economy", 30);
    const days = Array.from({ length: 200 }, (_, i) => i + 1);
    const breakdowns = days.filter((day) => wearBreakdown(state, day));
    expect(breakdowns.length).toBeGreaterThan(20);
    expect(breakdowns.length).toBeLessThan(140);
  });

  it("is deterministic: the same day decides the same way", () => {
    const state = at("economy", 30);
    for (let day = 1; day < 50; day += 1) expect(wearBreakdown(state, day)).toEqual(wearBreakdown(state, day));
  });

  it("is diagnostic-shaped, says what happened and grows with how bad the condition is", () => {
    const day = Array.from({ length: 400 }, (_, i) => i + 1).find((d) => wearBreakdown(at("economy", 10), d) && wearBreakdown(at("economy", 30), d) && wearBreakdown(at("economy", 50), d));
    expect(wearBreakdown(at("economy", 10), day)).toMatchObject({ type: "error", severity: "high" });
    expect(wearBreakdown(at("economy", 30), day).severity).toBe("medium");
    expect(wearBreakdown(at("economy", 50), day).severity).toBe("low");
    expect(wearBreakdown(at("economy", 10), day).message).toMatch(/usure/i);
  });

  it("stops while too many earlier ones are unresolved", () => {
    const state = at("economy", 0);
    const day = Array.from({ length: 200 }, (_, i) => i + 1).find((d) => wearBreakdown(state, d));
    expect(wearBreakdown(state, day, MAX_WEAR_INCIDENTS - 1)).not.toBeNull();
    expect(wearBreakdown(state, day, MAX_WEAR_INCIDENTS)).toBeNull();
  });
});
