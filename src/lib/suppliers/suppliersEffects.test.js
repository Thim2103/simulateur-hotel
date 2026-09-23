import { computeDailyMaintenance } from "../maintenance/maintenanceCostEngine";
import { calculateReputation } from "../progression/reputation";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildDailyReview } from "../dashboard/dailyReview";
import { treasuryOf } from "../finance/investmentFunding";
import { purchaseItems, ledgerOf, isOwned } from "./suppliersEngine";

const rooms = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, number: String(100 + i), type: "standard", price: 120, status: "libre", capacity: 2, housekeeping_status: "clean" }));
const base = (extra = {}) => ({ finance: { revenue: [500000], costs: [0] }, progression: { player: { reputation: 60 } }, ...extra });
const owning = (itemId, extra = {}) => purchaseItems({ hotelState: base(extra) }, [{ itemId, quantity: 1 }], { day: 1, date: "2026-09-22" }).hotelState;

describe("suppliers / the upkeep bill", () => {
  it("falls with equipment whose impact trims maintenance cost", () => {
    const plain = computeDailyMaintenance({ hotelState: base(), rooms });
    const equipped = computeDailyMaintenance({ hotelState: owning("equipment-climate-luxury"), rooms }); // -10 %
    expect(plain.total).toBe(100); // 20 standard rooms at 5 EUR
    expect(equipped.total).toBe(Math.round(100 * 0.9));
  });

  it("stacks with the ecological renovation's own factor (majorProjectsEngine.js)", () => {
    const both = computeDailyMaintenance({
      hotelState: { ...owning("equipment-climate-luxury"), majorProjects: { built: { eco: { day: 1 } }, works: {}, log: [] } },
      rooms,
    });
    // eco (× 0.8) and the supplier factor (× 0.9) both apply.
    expect(both.total).toBe(Math.round(100 * 0.8 * 0.9));
  });

  it("an item with no maintenanceCost impact changes nothing", () => {
    expect(computeDailyMaintenance({ hotelState: owning("furniture-rooms-entry"), rooms }).total).toBe(computeDailyMaintenance({ hotelState: base(), rooms }).total);
  });
});

describe("suppliers / reputation", () => {
  it("lifts the reputation target owned equipment's own bonus feeds", () => {
    const plain = calculateReputation({ hotelState: base(), restaurantState: { staff: [] } });
    const decorated = calculateReputation({ hotelState: owning("decor-art-luxury"), restaurantState: { staff: [] } }); // +0.3
    expect(decorated).toBeGreaterThanOrEqual(plain);
  });
});

describe("suppliers / through the career day", () => {
  function career(extra = {}) {
    return startCareer({
      playerId: "p",
      startDate: "2026-09-14",
      hotelState: { finance: { revenue: [500000], costs: [0], months: {}, fixedCosts: 0, payroll: 0 }, marketing: { budget: 0 }, esg: {}, ...extra },
      restaurantState: { finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 }, menu: [{ price: 20, cost: 8, sales: 10 }], staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }], operations: [], marketing: { budget: 0 }, esg: {} },
      rooms,
      reservations: [],
    });
  }
  const withOrder = (state, itemId) => ({ ...state, hotel: { ...state.hotel, hotelState: purchaseItems({ hotelState: state.hotel.hotelState }, [{ itemId, quantity: 1 }], { day: state.day, date: "2026-09-14" }).hotelState } });

  it("a hotel that never bought anything has no supplier state after a day", async () => {
    const { state } = await runCareerDay({ state: career(), rng: () => 0.999 });
    expect(state.hotel.hotelState.suppliers).toBeUndefined();
  });

  it("the purchase really lowers the treasury and shows in the finance costs", async () => {
    const plain = await runCareerDay({ state: career(), rng: () => 0.999 });
    const bought = await runCareerDay({ state: withOrder(career(), "furniture-rooms-entry"), rng: () => 0.999 });
    const item = { price: 420, deliveryFee: 60, installationCost: 40 };
    expect(treasuryOf(plain.state.hotel.hotelState) - treasuryOf(bought.state.hotel.hotelState)).toBe(item.price + item.deliveryFee + item.installationCost);
    expect(isOwned(bought.state.hotel.hotelState, "furniture-rooms-entry")).toBe(true);
    expect(ledgerOf(bought.state.hotel.hotelState)[2]).toBe(item.price + item.deliveryFee + item.installationCost);
  });

  it("the daily review tells the player about the order", async () => {
    const { state } = await runCareerDay({ state: withOrder(career(), "furniture-rooms-entry"), rng: () => 0.999 });
    const review = buildDailyReview({ careerState: state, dashboardState: { kpis: { revenueToday: 0, profit: 0, satisfaction: 3, staffMorale: 50, occupancyRate: 0, date: "d" } } });
    expect(review.causalChain.join("\n")).toMatch(/Commande fournisseurs livrée/);
  });
});
