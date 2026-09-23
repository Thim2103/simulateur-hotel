import { purchaseItems } from "../suppliers/suppliersEngine";
import { startProject, advanceMajorProjects } from "../expansion/majorProjectsEngine";
import { itemById } from "../suppliers/suppliersData";
import { TFE_CLASSES, TFE_CLASS_IDS, tfeClassOf, depreciationLots, depreciationSummaryByClass, describeDepreciationPlan } from "./depreciationEngine";

const hotel = (extra = {}) => ({ finance: { revenue: [500000], costs: [0] }, expansion: { availableCapital: 0 }, structure: { starRating: 3 }, ...extra });

describe("depreciationEngine / classifying accounts", () => {
  it("puts every catalogue account under a TFE class", () => {
    expect(tfeClassOf(2130)).toBe(21); // PMS
    expect(tfeClassOf(24010)).toBe(24); // furniture
    expect(tfeClassOf(24040)).toBe(24);
    expect(tfeClassOf(2420)).toBe(26); // decor
    expect(tfeClassOf(234)).toBe(23); // fluids
    expect(tfeClassOf(2370)).toBe(23); // tableware
    expect(tfeClassOf(2410)).toBe(23); // electronics (tv/locks)
  });

  it("leaves major projects, zone upgrades and floors out of the fit-out table", () => {
    expect(tfeClassOf(2200)).toBeNull();
    expect(tfeClassOf(2250)).toBeNull();
    expect(tfeClassOf(2210)).toBeNull();
  });
});

describe("depreciationEngine / inert without a purchase", () => {
  it("has no lots and every class at zero", () => {
    const plan = describeDepreciationPlan(hotel(), 0);
    expect(plan.lots).toEqual([]);
    expect(plan.total).toEqual({ va: 0, annualDotation: 0, cumulative: 0, vcn: 0 });
    plan.byClass.forEach((entry) => expect(entry).toMatchObject({ va: 0, annualDotation: 0, cumulative: 0, vcn: 0, count: 0 }));
  });
});

describe("depreciationEngine / a fit-out purchase", () => {
  it("lists it at its own TFE class, cost, useful life and rate", () => {
    const item = itemById("furniture-rooms-entry"); // 420+60+40=520, 10-year furniture
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: item.id, quantity: 1 }], { day: 1 }).hotelState;
    const [lot] = depreciationLots(state, 1);
    expect(lot).toMatchObject({ label: item.name, accountCode: 24010, tfeClass: 24, va: 520, years: 10, rate: 0.1, annualDotation: 52 });
  });

  it("a wing built (majorProjectsEngine.js) never appears in the fit-out table", () => {
    let state = startProject({ hotelState: hotel() }, "eco", { day: 1 }).hotelState;
    state = advanceMajorProjects({ hotelState: state, rooms: [] }, { day: 4 }).hotelState;
    expect(depreciationLots(state, 4)).toEqual([]);
  });

  it("the annual dotation is cost / years, and the cumulative grows with the day, capped at cost", () => {
    const item = itemById("electronics-tv-luxury"); // electronics, 4-year life
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: item.id, quantity: 1 }], { day: 0 }).hotelState;
    const cost = item.price + item.deliveryFee + item.installationCost;
    const halfLife = Math.round((4 * 365) / 2);
    const [halfway] = depreciationLots(state, halfLife);
    expect(halfway.cumulative).toBeCloseTo(cost / 2, 0);
    const [overTheHill] = depreciationLots(state, 4 * 365 * 3);
    expect(overTheHill.cumulative).toBe(overTheHill.va);
    expect(overTheHill.vcn).toBe(0);
  });

  it("groups by TFE class in the synthetic table", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 1 }, { itemId: "furniture-hall-standard", quantity: 1 }, { itemId: "decor-plants-entry", quantity: 1 }], { day: 1 }).hotelState;
    const byClass = depreciationSummaryByClass(state, 1);
    const furniture = byClass.find((entry) => entry.code === 24);
    const decor = byClass.find((entry) => entry.code === 26);
    expect(furniture.count).toBe(2);
    expect(decor.count).toBe(1);
    expect(byClass).toHaveLength(TFE_CLASS_IDS.length);
  });

  it("the grand total is the sum of every lot", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 1 }, { itemId: "electronics-pms-entry", quantity: 1 }], { day: 1 }).hotelState;
    const plan = describeDepreciationPlan(state, 1);
    expect(plan.total.va).toBe(plan.lots.reduce((sum, lot) => sum + lot.va, 0));
    expect(plan.classes[21]).toEqual(TFE_CLASSES[21]);
  });
});

describe("depreciationEngine / purity", () => {
  it("is deterministic and leaves its input alone", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: 1 }).hotelState;
    const frozen = JSON.stringify(state);
    expect(describeDepreciationPlan(state, 10)).toEqual(describeDepreciationPlan(state, 10));
    expect(JSON.stringify(state)).toBe(frozen);
  });
});
