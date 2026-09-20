import {
  ZONES,
  UPGRADES,
  MAX_LEVEL,
  MAX_STANDING,
  NEUTRAL_EFFECTS,
  upgradesForZone,
  zoneForCell,
  isInstalled,
  worksFor,
  activeWorks,
  zoneLevel,
  availableCapital,
  zoneSummary,
  upgradeStatus,
  computeZoneEffects,
  zoneSatisfactionAdjustment,
  startUpgrade,
  advanceZoneUpgrades,
  upgradesCompletedOn,
  describeEffects,
  levelStars,
} from "./zoneUpgradesEngine";

const hotel = (extra = {}) => ({ expansion: { availableCapital: 100000 }, ...extra });
const bundle = (extra) => ({ hotelState: hotel(extra) });
const installed = (...ids) => ({ zoneUpgrades: { installed: Object.fromEntries(ids.map((id) => [id, { day: 1 }])), works: {}, completedLog: [] } });
const underWorks = (id, completesOnDay = 9) => ({ zoneUpgrades: { installed: {}, works: { [id]: { startedOnDay: 1, completesOnDay } }, completedLog: [] } });

describe("zoneUpgradesEngine / catalog", () => {
  it("has exactly three upgrades per zone, every one pointing at a real zone", () => {
    Object.keys(ZONES).forEach((zoneId) => expect(upgradesForZone(zoneId)).toHaveLength(MAX_LEVEL));
    Object.values(UPGRADES).forEach((upgrade) => expect(ZONES[upgrade.zone]).toBeDefined());
  });

  it("every upgrade has a positive cost and duration, and at least one effect", () => {
    Object.values(UPGRADES).forEach((upgrade) => {
      expect(upgrade.cost).toBeGreaterThan(0);
      expect(upgrade.days).toBeGreaterThanOrEqual(1);
      expect(upgrade.days).toBeLessThanOrEqual(3);
      expect(Object.keys(upgrade.effects).length).toBeGreaterThan(0);
    });
  });

  it("every prerequisite exists and belongs to the same zone", () => {
    Object.values(UPGRADES).forEach((upgrade) =>
      (upgrade.requires || []).forEach((id) => expect(UPGRADES[id].zone).toBe(upgrade.zone))
    );
  });

  it("maps schematic cell types to their zone", () => {
    expect(zoneForCell("room")).toBe("rooms");
    expect(zoneForCell("reception")).toBe("lobby");
    expect(zoneForCell("hall")).toBe("lobby");
    expect(zoneForCell("kitchen")).toBe("restaurant");
    expect(zoneForCell("laundry")).toBe("laundry");
    expect(zoneForCell("pool")).toBe("pool");
    expect(zoneForCell("mystery")).toBeNull();
  });

  it("covers the requested benefits: rooms, lobby, laundry", () => {
    expect(UPGRADES["rooms-bedding"].effects.standing).toBeGreaterThan(0);
    expect(UPGRADES["rooms-soundproofing"].effects.incidentRateMultiplier).toBeLessThan(1);
    expect(UPGRADES["rooms-domotics"].effects.energySavingsDaily).toBeGreaterThan(0);
    expect(UPGRADES["lobby-kiosk"].effects.receptionCapacityMultiplier).toBeGreaterThan(1);
    expect(UPGRADES["lobby-decor"].effects.reputationBonus).toBeGreaterThan(0);
    expect(UPGRADES["laundry-industrial"].effects.cleaningTimeMultiplier).toBeLessThan(1);
    expect(UPGRADES["laundry-industrial"].effects.incidentRateMultiplier).toBeLessThan(1);
  });
});

describe("zoneUpgradesEngine / state", () => {
  it("a hotel that never upgraded is at level 0 with no works and neutral effects", () => {
    expect(zoneLevel({}, "rooms")).toBe(0);
    expect(activeWorks({}, "rooms")).toBeNull();
    expect(isInstalled(undefined, "rooms-bedding")).toBe(false);
    expect(computeZoneEffects(undefined)).toEqual(NEUTRAL_EFFECTS);
    expect(zoneSatisfactionAdjustment({})).toBe(0);
  });

  it("level is the number of installed upgrades of the zone", () => {
    expect(zoneLevel(hotel(installed("rooms-bedding")), "rooms")).toBe(1);
    expect(zoneLevel(hotel(installed("rooms-bedding", "rooms-domotics", "lobby-kiosk")), "rooms")).toBe(2);
    expect(zoneLevel(hotel(installed("rooms-bedding", "rooms-soundproofing", "rooms-domotics")), "rooms")).toBe(MAX_LEVEL);
  });

  it("reads the hotel's real available capital", () => {
    expect(availableCapital(hotel())).toBe(100000);
    expect(availableCapital({})).toBe(0);
  });

  it("the rooftop only exists once the pool is built or being built", () => {
    expect(zoneSummary(hotel(), "pool").exists).toBe(false);
    expect(zoneSummary(hotel(underWorks("pool-build")), "pool").exists).toBe(true);
    expect(zoneSummary(hotel(installed("pool-build")), "pool").exists).toBe(true);
    expect(zoneSummary(hotel(), "rooms").exists).toBe(true);
  });

  it("a summary carries label, icon, level and any works", () => {
    const summary = zoneSummary(hotel(underWorks("rooms-bedding", 7)), "rooms");
    expect(summary).toMatchObject({ zoneId: "rooms", label: "Chambres", level: 0, maxLevel: 3 });
    expect(summary.works).toMatchObject({ upgradeId: "rooms-bedding", completesOnDay: 7 });
  });
});

describe("zoneUpgradesEngine / status", () => {
  it("available with enough capital", () => {
    expect(upgradeStatus(hotel(), "rooms-bedding")).toBe("available");
  });

  it("no-funds when the capital can't cover the cost", () => {
    expect(upgradeStatus({ expansion: { availableCapital: 100 } }, "rooms-bedding")).toBe("no-funds");
  });

  it("installed and in-progress", () => {
    expect(upgradeStatus(hotel(installed("rooms-bedding")), "rooms-bedding")).toBe("installed");
    expect(upgradeStatus(hotel(underWorks("rooms-bedding")), "rooms-bedding")).toBe("in-progress");
  });

  it("zone-busy for another upgrade of a zone already under works, free for other zones", () => {
    const state = hotel(underWorks("rooms-bedding"));
    expect(upgradeStatus(state, "rooms-soundproofing")).toBe("zone-busy");
    expect(upgradeStatus(state, "lobby-kiosk")).toBe("available");
  });

  it("locked until the prerequisite is installed", () => {
    expect(upgradeStatus(hotel(), "pool-lounge")).toBe("locked");
    expect(upgradeStatus(hotel(installed("pool-build")), "pool-lounge")).toBe("available");
  });

  it("unknown upgrades are unknown", () => {
    expect(upgradeStatus(hotel(), "nope")).toBe("unknown");
  });
});

describe("zoneUpgradesEngine / startUpgrade", () => {
  it("debits the capital and starts works that finish after the upgrade's duration", () => {
    const next = startUpgrade(bundle(), "rooms-bedding", { day: 5 }).hotelState;
    expect(next.expansion.availableCapital).toBe(100000 - UPGRADES["rooms-bedding"].cost);
    expect(worksFor(next, "rooms-bedding")).toEqual({ startedOnDay: 5, completesOnDay: 5 + UPGRADES["rooms-bedding"].days });
    expect(isInstalled(next, "rooms-bedding")).toBe(false); // not yet
  });

  it("preserves other expansion fields and previously installed upgrades", () => {
    const start = bundle({ expansion: { availableCapital: 100000, establishments: ["x"] }, ...installed("lobby-kiosk") });
    const next = startUpgrade(start, "rooms-bedding", { day: 1 }).hotelState;
    expect(next.expansion.establishments).toEqual(["x"]);
    expect(isInstalled(next, "lobby-kiosk")).toBe(true);
  });

  it("is a no-op when it can't be started: no funds, busy zone, locked, already installed, unknown", () => {
    const poor = { hotelState: { expansion: { availableCapital: 10 } } };
    expect(startUpgrade(poor, "rooms-bedding")).toBe(poor);

    const busy = bundle(underWorks("rooms-bedding"));
    expect(startUpgrade(busy, "rooms-soundproofing")).toBe(busy);

    const start = bundle();
    expect(startUpgrade(start, "pool-lounge")).toBe(start);
    expect(startUpgrade(start, "nope")).toBe(start);

    const done = bundle(installed("rooms-bedding"));
    expect(startUpgrade(done, "rooms-bedding")).toBe(done);
  });

  it("can't be started twice (no double charge)", () => {
    const once = startUpgrade(bundle(), "rooms-bedding", { day: 1 });
    expect(startUpgrade(once, "rooms-bedding", { day: 1 })).toBe(once);
  });

  it("two different zones can be under works at once", () => {
    let start = startUpgrade(bundle(), "rooms-bedding", { day: 1 });
    start = startUpgrade(start, "lobby-kiosk", { day: 1 });
    expect(activeWorks(start.hotelState, "rooms")).not.toBeNull();
    expect(activeWorks(start.hotelState, "lobby")).not.toBeNull();
  });

  it("never mutates its input", () => {
    const start = bundle();
    const snapshot = JSON.stringify(start);
    startUpgrade(start, "rooms-bedding", { day: 1 });
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});

describe("zoneUpgradesEngine / advanceZoneUpgrades", () => {
  it("does nothing while works are still running", () => {
    const state = startUpgrade(bundle(), "rooms-bedding", { day: 1 }).hotelState; // done day 3
    expect(advanceZoneUpgrades(state, 2)).toBe(state);
  });

  it("installs the upgrade on the day it completes and logs it", () => {
    const state = startUpgrade(bundle(), "rooms-bedding", { day: 1 }).hotelState;
    const done = advanceZoneUpgrades(state, 3);
    expect(isInstalled(done, "rooms-bedding")).toBe(true);
    expect(worksFor(done, "rooms-bedding")).toBeNull();
    expect(upgradesCompletedOn(done, 3)).toEqual([{ id: "upgrade-done:rooms-bedding:3", upgradeId: "rooms-bedding", day: 3 }]);
    expect(upgradesCompletedOn(done, 4)).toEqual([]);
  });

  it("installs an overdue one too (a day skipped)", () => {
    const state = startUpgrade(bundle(), "rooms-bedding", { day: 1 }).hotelState;
    expect(isInstalled(advanceZoneUpgrades(state, 10), "rooms-bedding")).toBe(true);
  });

  it("finishes several at once, leaving the rest running", () => {
    let start = startUpgrade(bundle(), "lobby-kiosk", { day: 1 }); // 1 day
    start = startUpgrade(start, "rooms-bedding", { day: 1 }); // 2 days
    const day2 = advanceZoneUpgrades(start.hotelState, 2); // the kiosk (1 day) is done, the bedding (2 days) is not
    expect(isInstalled(day2, "lobby-kiosk")).toBe(true);
    expect(isInstalled(day2, "rooms-bedding")).toBe(false);
    expect(worksFor(day2, "rooms-bedding")).not.toBeNull();
    const day3 = advanceZoneUpgrades(start.hotelState, 3);
    expect(isInstalled(day3, "lobby-kiosk")).toBe(true);
    expect(isInstalled(day3, "rooms-bedding")).toBe(true);
  });

  it("is a no-op for a hotel with no works, and the finished zone can then take the next upgrade", () => {
    const plain = hotel();
    expect(advanceZoneUpgrades(plain, 5)).toBe(plain);
    const state = advanceZoneUpgrades(startUpgrade(bundle(), "rooms-bedding", { day: 1 }).hotelState, 3);
    expect(upgradeStatus(state, "rooms-soundproofing")).toBe("available");
  });
});

describe("zoneUpgradesEngine / effects", () => {
  it("adds up standing, reputation, satisfaction and energy across installed upgrades", () => {
    const effects = computeZoneEffects(hotel(installed("rooms-bedding", "lobby-decor", "rooms-domotics")));
    expect(effects.standing).toBeCloseTo(0.04 + 0.05);
    expect(effects.reputationBonus).toBe(3);
    expect(effects.satisfactionBonus).toBe(3);
    expect(effects.energySavingsDaily).toBe(25);
  });

  it("multiplies the multipliers", () => {
    const effects = computeZoneEffects(hotel(installed("laundry-industrial", "laundry-preventive")));
    expect(effects.incidentRateMultiplier).toBeCloseTo(0.5 * 0.8);
    expect(effects.cleaningTimeMultiplier).toBeCloseTo(0.8);
  });

  it("caps standing", () => {
    const all = Object.keys(UPGRADES);
    expect(computeZoneEffects(hotel(installed(...all))).standing).toBe(MAX_STANDING);
  });

  it("ignores an unknown installed id", () => {
    expect(computeZoneEffects(hotel(installed("ghost")))).toEqual(NEUTRAL_EFFECTS);
  });

  it("works in progress cost something: rooms dent satisfaction, laundry slows cleaning, lobby cuts reception capacity", () => {
    expect(computeZoneEffects(hotel(underWorks("rooms-bedding"))).satisfactionPenalty).toBeGreaterThan(0);
    expect(computeZoneEffects(hotel(underWorks("laundry-industrial"))).cleaningTimeMultiplier).toBeGreaterThan(1);
    expect(computeZoneEffects(hotel(underWorks("lobby-kiosk"))).receptionCapacityMultiplier).toBeLessThan(1);
    expect(computeZoneEffects(hotel(underWorks("pool-build")))).toEqual(NEUTRAL_EFFECTS);
  });

  it("net satisfaction is the bonus minus the works' nuisance", () => {
    const state = hotel({ zoneUpgrades: { installed: { "rooms-soundproofing": { day: 1 } }, works: { "rooms-bedding": { startedOnDay: 1, completesOnDay: 3 } }, completedLog: [] } });
    expect(zoneSatisfactionAdjustment(state)).toBe(2 - 4);
  });
});

describe("zoneUpgradesEngine / display helpers", () => {
  it("draws the level as stars", () => {
    expect(levelStars(0)).toBe("☆☆☆");
    expect(levelStars(2)).toBe("⭐⭐☆");
    expect(levelStars(3)).toBe("⭐⭐⭐");
  });

  it("describes every kind of benefit in plain French", () => {
    const lines = describeEffects({
      standing: 0.05,
      reputationBonus: 3,
      satisfactionBonus: 2,
      incidentRateMultiplier: 0.5,
      energySavingsDaily: 25,
      cleaningTimeMultiplier: 0.8,
      receptionCapacityMultiplier: 1.4,
    });
    expect(lines.join("|")).toMatch(/Standing \+5 %/);
    expect(lines.join("|")).toMatch(/Réputation \+3/);
    expect(lines.join("|")).toMatch(/Satisfaction des clients \+2/);
    expect(lines.join("|")).toMatch(/50 % de pannes en moins/);
    expect(lines.join("|")).toMatch(/−25 €\/jour/);
    expect(lines.join("|")).toMatch(/Nettoyage 20 % plus rapide/);
    expect(lines.join("|")).toMatch(/\+40 % de clients accueillis/);
    expect(describeEffects(undefined)).toEqual([]);
  });

  it("every catalog upgrade has at least one benefit line", () => {
    Object.values(UPGRADES).forEach((upgrade) => expect(describeEffects(upgrade.effects).length).toBeGreaterThan(0));
  });
});
