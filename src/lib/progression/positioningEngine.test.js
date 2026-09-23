import { AXES, tierById, tiersForAxis, isInstalled, installedAxes, tierStatus, invest, computePositioningEffects } from "./positioningEngine";

const hotel = (extra = {}) => ({ finance: { revenue: [20000], costs: [0] }, expansion: { availableCapital: 0 }, ...extra });

describe("positioningEngine / catalogue", () => {
  it("every axis has at least one tier, each with a real cost, reputation gain and attracted segments", () => {
    Object.values(AXES).forEach((axis) => {
      expect(axis.tiers.length).toBeGreaterThan(0);
      axis.tiers.forEach((tier) => {
        expect(tier.cost).toBeGreaterThan(0);
        expect(tier.reputationBonus).toBeGreaterThan(0);
        expect(tier.attractsSegments.length).toBeGreaterThan(0);
      });
    });
  });

  it("tierById finds a real tier, tagged with its own axisId", () => {
    expect(tierById("eco-breakfast").axisId).toBe("eco");
  });

  it("tiersForAxis lists an axis's own tiers only", () => {
    expect(tiersForAxis("business").every((tier) => tier.axisId === "business")).toBe(true);
  });
});

describe("positioningEngine / tierStatus and invest", () => {
  it("a tier the hotel can afford is available", () => {
    expect(tierStatus(hotel(), "eco-breakfast")).toBe("available");
  });

  it("a tier the hotel can't afford reads no-funds", () => {
    expect(tierStatus(hotel({ finance: { revenue: [0], costs: [0] } }), "gastronomy-table-hote")).toBe("no-funds");
  });

  it("investing debits the treasury and installs the tier immediately", () => {
    const bundle = { hotelState: hotel() };
    const result = invest(bundle, "eco-breakfast", { day: 3 });
    expect(isInstalled(result.hotelState, "eco-breakfast")).toBe(true);
    expect(result.hotelState.finance.costs).toEqual([1500]);
  });

  it("investing in an already-installed tier is a no-op", () => {
    let bundle = { hotelState: hotel() };
    bundle = invest(bundle, "eco-breakfast", { day: 1 });
    const again = invest(bundle, "eco-breakfast", { day: 2 });
    expect(again).toBe(bundle);
  });

  it("investing without enough funds is a no-op", () => {
    const bundle = { hotelState: hotel({ finance: { revenue: [0], costs: [0] } }) };
    expect(invest(bundle, "gastronomy-table-hote", { day: 1 })).toBe(bundle);
  });
});

describe("positioningEngine / installedAxes and computePositioningEffects", () => {
  it("a hotel that never invested has no active axis and neutral effects", () => {
    expect(installedAxes(hotel())).toEqual([]);
    expect(computePositioningEffects(hotel())).toEqual({ reputationBonus: 0, segmentAttraction: {} });
  });

  it("combines the reputation bonus and segment attraction of every installed tier", () => {
    let bundle = { hotelState: hotel() };
    bundle = invest(bundle, "eco-breakfast", { day: 1 }); // +2 rep, hikers-eco + couples-leisure
    bundle = invest(bundle, "boutique-decor", { day: 1 }); // +3 rep, couples-leisure
    const effects = computePositioningEffects(bundle.hotelState);
    expect(effects.reputationBonus).toBe(5);
    expect(effects.segmentAttraction["couples-leisure"]).toBe(2);
    expect(effects.segmentAttraction["hikers-eco"]).toBe(1);
    expect(installedAxes(bundle.hotelState)).toEqual(["eco", "boutique"]);
  });
});
