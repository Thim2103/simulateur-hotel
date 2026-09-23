import {
  CATEGORY_IDS,
  TIER_IDS,
  MAX_REPUTATION_BONUS,
  MAX_RSE_BONUS,
  MIN_MAINTENANCE_FACTOR,
  purchaseHistory,
  ledgerOf,
  ownedQuantity,
  isOwned,
  ownedItemIds,
  priceCart,
  canAffordCart,
  purchaseItems,
  supplierReputationBonus,
  supplierSustainabilityBonus,
  supplierMaintenanceFactor,
  purchasesOn,
  supplierNewsOn,
  describeCatalogue,
  describeCart,
  describeSuppliers,
} from "./suppliersEngine";
import { CATALOGUE, CATEGORIES, accountClassOf, itemById } from "./suppliersData";
import { treasuryOf, capitalOf } from "../finance/investmentFunding";

const DATE = "2026-09-22";
const hotel = (extra = {}) => ({ finance: { revenue: [500000], costs: [0] }, expansion: { availableCapital: 0 }, ...extra });
const buy = (cart, extra = {}, day = 3) => purchaseItems({ hotelState: hotel(extra) }, cart, { day, date: DATE }).hotelState;

describe("suppliersEngine / the catalogue", () => {
  it("has every category and tier represented", () => {
    CATEGORY_IDS.forEach((category) => {
      expect(CATALOGUE.filter((item) => item.category === category).length).toBeGreaterThanOrEqual(3);
    });
    TIER_IDS.forEach((tier) => {
      expect(CATALOGUE.some((item) => item.tier === tier)).toBe(true);
    });
  });

  it("every item is priced, billed to a real supplier and has a PCMN account", () => {
    CATALOGUE.forEach((item) => {
      expect(item.price).toBeGreaterThan(0);
      expect(item.supplierName).toBeTruthy();
      expect(item.accountCode).toBeGreaterThan(0);
      expect([2, 3, 6]).toContain(accountClassOf(item.accountCode));
      expect(CATEGORIES[item.category]).toBeTruthy();
    });
  });

  it("has unique ids", () => {
    expect(new Set(CATALOGUE.map((item) => item.id)).size).toBe(CATALOGUE.length);
  });
});

describe("suppliersEngine / inert without a purchase", () => {
  it("does nothing, and keeps no state", () => {
    const state = hotel();
    expect(purchaseHistory(state)).toEqual([]);
    expect(ledgerOf(state)).toEqual({ 2: 0, 3: 0, 6: 0 });
    expect(ownedItemIds(state)).toEqual([]);
    expect(isOwned(state, "furniture-rooms-entry")).toBe(false);
    expect(purchasesOn(state, 3)).toEqual([]);
    expect(supplierNewsOn(state, DATE)).toEqual([]);
  });

  it("every effect is neutral", () => {
    const state = hotel();
    expect(supplierReputationBonus(state)).toBe(0);
    expect(supplierSustainabilityBonus(state)).toBe(0);
    expect(supplierMaintenanceFactor(state)).toBe(1);
  });
});

describe("suppliersEngine / pricing a cart", () => {
  it("prices a line as price × quantity, plus delivery and installation once", () => {
    const item = itemById("furniture-rooms-entry");
    const { lines, total } = priceCart([{ itemId: item.id, quantity: 3 }]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ itemId: item.id, quantity: 3, accountCode: item.accountCode, accountClass: 2 });
    expect(lines[0].lineTotal).toBe(item.price * 3 + item.deliveryFee + item.installationCost);
    expect(total).toBe(lines[0].lineTotal);
  });

  it("drops unknown items and non-positive quantities", () => {
    expect(priceCart([{ itemId: "nope", quantity: 5 }]).lines).toEqual([]);
    expect(priceCart([{ itemId: "furniture-rooms-entry", quantity: 0 }]).lines).toEqual([]);
    expect(priceCart([{ itemId: "furniture-rooms-entry", quantity: -2 }]).lines).toEqual([]);
    expect(priceCart(undefined).lines).toEqual([]);
  });

  it("splits the total by PCMN class", () => {
    const { byClass } = priceCart([{ itemId: "furniture-rooms-entry", quantity: 1 }, { itemId: "linens-sheets-entry", quantity: 1 }]);
    const furniture = itemById("furniture-rooms-entry");
    const linens = itemById("linens-sheets-entry");
    expect(byClass[2]).toBe(furniture.price + furniture.deliveryFee + furniture.installationCost);
    expect(byClass[3]).toBe(linens.price + linens.deliveryFee + linens.installationCost);
    expect(byClass[6]).toBe(0);
  });
});

describe("suppliersEngine / affordability", () => {
  it("is affordable when capital and treasury together cover it", () => {
    const item = itemById("furniture-rooms-luxury"); // 2400 + 150 + 180 = 2730
    expect(canAffordCart(hotel({ finance: { revenue: [2730], costs: [0] } }), [{ itemId: item.id, quantity: 1 }])).toBe(true);
    expect(canAffordCart(hotel({ finance: { revenue: [2729], costs: [0] } }), [{ itemId: item.id, quantity: 1 }])).toBe(false);
  });

  it("a Classe 6 charge (a pure service, not a good) draws on the treasury only", () => {
    const item = itemById("equipment-maintenance-contract"); // 1800, Classe 6
    expect(accountClassOf(item.accountCode)).toBe(6);
    expect(canAffordCart(hotel({ finance: { revenue: [1800], costs: [0] } }), [{ itemId: item.id, quantity: 1 }])).toBe(true);
    expect(canAffordCart(hotel({ finance: { revenue: [1799], costs: [0] } }), [{ itemId: item.id, quantity: 1 }])).toBe(false);
    // The capital pot can't cover a Classe 6 charge, even when it would
    // otherwise be enough: only the treasury pays for a pure charge.
    expect(canAffordCart(hotel({ finance: { revenue: [0], costs: [0] }, expansion: { availableCapital: 1800 } }), [{ itemId: item.id, quantity: 1 }])).toBe(false);
  });

  it("the capital pot pays before the treasury", () => {
    const item = itemById("furniture-rooms-entry"); // 420 + 60 + 40 = 520
    expect(canAffordCart(hotel({ finance: { revenue: [0], costs: [0] }, expansion: { availableCapital: 520 } }), [{ itemId: item.id, quantity: 1 }])).toBe(true);
  });
});

describe("suppliersEngine / placing the order", () => {
  it("pays from capital first, then the treasury, for a Classe 2 item", () => {
    const item = itemById("furniture-rooms-entry"); // 420 + 60 + 40 = 520
    const before = hotel({ expansion: { availableCapital: 200 } });
    const state = buy([{ itemId: item.id, quantity: 1 }], { expansion: { availableCapital: 200 } });
    expect(capitalOf(state)).toBe(0); // the 200 available was used in full
    expect(treasuryOf(before) - treasuryOf(state)).toBe(320); // the remaining 320 came from the treasury
  });

  it("books the spend to the asset ledger for a Classe 2 item", () => {
    const item = itemById("furniture-rooms-entry");
    const before = hotel();
    const state = buy([{ itemId: item.id, quantity: 2 }]);
    const expectedTotal = item.price * 2 + item.deliveryFee + item.installationCost;
    expect(ledgerOf(state)[2]).toBe(expectedTotal);
    expect(ledgerOf(state)[3]).toBe(0);
    expect(treasuryOf(before) - treasuryOf(state)).toBe(expectedTotal);
  });

  it("books the spend to the stock ledger for a Classe 3 item", () => {
    const item = itemById("linens-sheets-standard");
    const state = buy([{ itemId: item.id, quantity: 4 }]);
    expect(ledgerOf(state)[3]).toBe(item.price * 4 + item.deliveryFee + item.installationCost);
    expect(ledgerOf(state)[2]).toBe(0);
  });

  it("books a Classe 6 charge straight to the day's expenses, never to the capital pot", () => {
    const item = itemById("equipment-maintenance-contract");
    const before = hotel({ expansion: { availableCapital: 5000 } });
    const state = buy([{ itemId: item.id, quantity: 1 }], { expansion: { availableCapital: 5000 } });
    expect(ledgerOf(state)[6]).toBe(item.price);
    expect(capitalOf(state)).toBe(5000); // untouched
    expect(treasuryOf(before) - treasuryOf(state)).toBe(item.price);
  });

  it("routes a mixed cart to the right ledgers in one order", () => {
    const state = buy([{ itemId: "furniture-rooms-entry", quantity: 1 }, { itemId: "linens-sheets-entry", quantity: 1 }, { itemId: "equipment-maintenance-contract", quantity: 1 }]);
    expect(ledgerOf(state)[2]).toBeGreaterThan(0);
    expect(ledgerOf(state)[3]).toBeGreaterThan(0);
    expect(ledgerOf(state)[6]).toBe(itemById("equipment-maintenance-contract").price);
  });

  it("marks the item's type as owned, whatever the quantity", () => {
    const state = buy([{ itemId: "furniture-rooms-entry", quantity: 5 }]);
    expect(isOwned(state, "furniture-rooms-entry")).toBe(true);
    expect(ownedQuantity(state, "furniture-rooms-entry")).toBe(5);
    expect(ownedItemIds(state)).toEqual(["furniture-rooms-entry"]);
  });

  it("a second order adds to the quantity already owned, and remembers the first day", () => {
    const first = buy([{ itemId: "furniture-rooms-entry", quantity: 2 }], {}, 3);
    const second = purchaseItems({ hotelState: first }, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: 8, date: "2026-09-27" }).hotelState;
    expect(ownedQuantity(second, "furniture-rooms-entry")).toBe(3);
    expect(second.suppliers.owned["furniture-rooms-entry"].firstPurchasedDay).toBe(3);
  });

  it("records the order, its lines and its total", () => {
    const state = buy([{ itemId: "furniture-rooms-entry", quantity: 1 }, { itemId: "linens-sheets-entry", quantity: 2 }]);
    const orders = purchaseHistory(state);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ day: 3, date: DATE });
    expect(orders[0].lines).toHaveLength(2);
    expect(orders[0].total).toBe(orders[0].lines.reduce((sum, line) => sum + line.lineTotal, 0));
  });

  it("says so", () => {
    const state = buy([{ itemId: "furniture-rooms-entry", quantity: 1 }]);
    expect(state.suppliers.lastOutcome).toMatchObject({ type: "purchase", day: 3 });
    expect(state.suppliers.lastOutcome.text).toMatch(/Commande de 1 article/);
  });

  it("does nothing for an empty cart, an unaffordable one, or junk", () => {
    const bundle = { hotelState: hotel() };
    expect(purchaseItems(bundle, [])).toBe(bundle);
    expect(purchaseItems(bundle, [{ itemId: "nope", quantity: 1 }])).toBe(bundle);
    const poor = { hotelState: hotel({ finance: { revenue: [10], costs: [0] } }) };
    expect(purchaseItems(poor, [{ itemId: "decor-art-luxury", quantity: 1 }])).toBe(poor);
  });

  it("leaves the rest of the bundle alone", () => {
    const bundle = { hotelState: hotel(), rooms: [{ id: 1 }], reservations: [] };
    const next = purchaseItems(bundle, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: 1 });
    expect(next.rooms).toBe(bundle.rooms);
    expect(next.reservations).toBe(bundle.reservations);
  });
});

describe("suppliersEngine / what owning equipment does", () => {
  it("adds up the reputation and RSE bonuses of every owned type, capped", () => {
    const state = buy([{ itemId: "decor-art-luxury", quantity: 1 }, { itemId: "equipment-climate-luxury", quantity: 1 }]);
    const expected = itemById("decor-art-luxury").impact.reputation + itemById("equipment-climate-luxury").impact.reputation;
    expect(supplierReputationBonus(state)).toBeCloseTo(expected, 8);
    expect(supplierReputationBonus(state)).toBeLessThanOrEqual(MAX_REPUTATION_BONUS);
  });

  it("never exceeds the caps, however much is bought", () => {
    let state = hotel({ finance: { revenue: [900000], costs: [0] } });
    ["decor-art-luxury", "decor-plants-luxury", "equipment-climate-luxury", "electronics-pms-luxury"].forEach((itemId) => {
      state = purchaseItems({ hotelState: state }, [{ itemId, quantity: 1 }], { day: 1 }).hotelState;
    });
    expect(supplierReputationBonus(state)).toBeLessThanOrEqual(MAX_REPUTATION_BONUS);
    expect(supplierSustainabilityBonus(state)).toBeLessThanOrEqual(MAX_RSE_BONUS);
    expect(supplierMaintenanceFactor(state)).toBeGreaterThanOrEqual(MIN_MAINTENANCE_FACTOR);
  });

  it("multiplies the maintenance factor, never below the floor", () => {
    const state = buy([{ itemId: "equipment-climate-luxury", quantity: 1 }]); // -10 %
    expect(supplierMaintenanceFactor(state)).toBeCloseTo(0.9, 8);
  });

  it("buying a second unit of an already-owned item changes nothing further", () => {
    const once = buy([{ itemId: "decor-art-luxury", quantity: 1 }]);
    const twice = purchaseItems({ hotelState: once }, [{ itemId: "decor-art-luxury", quantity: 1 }], { day: 4 }).hotelState;
    expect(supplierReputationBonus(twice)).toBe(supplierReputationBonus(once));
  });
});

describe("suppliersEngine / the day's news", () => {
  it("reports the order placed that day", () => {
    const state = buy([{ itemId: "furniture-rooms-entry", quantity: 1 }]);
    expect(purchasesOn(state, 3)).toHaveLength(1);
    expect(supplierNewsOn(state, DATE)[0]).toMatch(/Commande fournisseurs livrée/);
  });

  it("is silent about another day", () => {
    const state = buy([{ itemId: "furniture-rooms-entry", quantity: 1 }]);
    expect(supplierNewsOn(state, "2026-09-23")).toEqual([]);
  });
});

describe("suppliersEngine / how the interface reads it", () => {
  it("describes the catalogue, filtered by category and tier, each flagged owned/affordable", () => {
    const state = buy([{ itemId: "furniture-rooms-entry", quantity: 1 }]);
    const all = describeCatalogue(state);
    expect(all).toHaveLength(CATALOGUE.length);
    expect(all.find((item) => item.id === "furniture-rooms-entry").owned).toBe(true);
    const furnitureOnly = describeCatalogue(state, { category: "furniture" });
    expect(furnitureOnly.every((item) => item.category === "furniture")).toBe(true);
    const entryOnly = describeCatalogue(state, { tier: "entry" });
    expect(entryOnly.every((item) => item.tier === "entry")).toBe(true);
  });

  it("describes the cart, priced, with a reason when it can't be validated", () => {
    const poor = hotel({ finance: { revenue: [10], costs: [0] } });
    expect(describeCart(poor, []).reason).toBe("Panier vide");
    expect(describeCart(poor, [{ itemId: "decor-art-luxury", quantity: 1 }]).reason).toBe("Trésorerie insuffisante");
    expect(describeCart(hotel(), [{ itemId: "furniture-rooms-entry", quantity: 1 }])).toMatchObject({ affordable: true, reason: "" });
  });

  it("gives the ledger and the current bonuses at a glance", () => {
    const state = buy([{ itemId: "equipment-climate-luxury", quantity: 1 }]);
    const described = describeSuppliers(state);
    expect(described.ledger[2]).toBeGreaterThan(0);
    expect(described.effects.maintenanceFactor).toBeCloseTo(0.9, 8);
    expect(described.ownedCount).toBe(1);
    expect(described.categories).toHaveLength(CATEGORY_IDS.length);
  });
});

describe("suppliersEngine / purity", () => {
  it("leaves its input alone and is deterministic", () => {
    const state = hotel();
    const cart = [{ itemId: "furniture-rooms-entry", quantity: 1 }];
    const frozen = JSON.stringify({ state, cart });
    const first = purchaseItems({ hotelState: state }, cart, { day: 1, date: DATE });
    const second = purchaseItems({ hotelState: state }, cart, { day: 1, date: DATE });
    expect(first).toEqual(second);
    expect(JSON.stringify({ state, cart })).toBe(frozen);
  });

  it("keeps a bounded order history", () => {
    let state = hotel({ finance: { revenue: [900000000], costs: [0] } });
    for (let i = 0; i < 35; i += 1) {
      state = purchaseItems({ hotelState: state }, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: i }).hotelState;
    }
    expect(state.suppliers.purchases.length).toBeLessThanOrEqual(30);
  });
});
