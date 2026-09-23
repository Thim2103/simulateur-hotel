// Fournisseurs & Catalogue d'Équipements: the hotel buys real goods from real
// suppliers (suppliersData.js) -- furniture, fluids, tableware, linens,
// electronics & PMS, food & drink, decor -- and the spend is routed to its
// PCMN account by the account code's class:
//
//   Classe 2 (immobilisations) -- durable equipment (furniture, fluids,
//     electronics, decor): added to the asset ledger, paid like any other
//     investment (capital first, then treasury -- finance/investmentFunding.js,
//     so a bank loan can cover it).
//   Classe 3 (stocks)         -- consumables (linens, food & drink): added to
//     the stock ledger, funded the same way as Classe 2.
//   Classe 6 (charges)        -- a pure operating charge (no item of the
//     shipped catalogue is one, but the routing is real: a Classe 6 line
//     is booked straight to the day's expenses, treasury only, exactly like
//     a bank fee or a loyalty perk -- see finance/oneOffCosts.debitCurrentMonth).
//
// EFFECTS. The first unit of an item ever bought "owns" it (like a zone
// upgrade or a major project: further units restock the shelves, they don't
// stack the bonus again) -- see suppliersData.js's `impact`:
//   reputation      -- points added to the reputation the hotel converges to
//                      (lib/progression/reputation.js), like a zone upgrade's
//                      reputationBonus
//   rse             -- points added to the sustainability score reputation.js
//                      reads, like a major project's ecoSustainabilityBonus
//   maintenanceCost -- a fraction (e.g. -0.1) that multiplies into the daily
//                      upkeep bill, like a major project's ecoUpkeepFactor
// All three are bounded (MAX_REPUTATION_BONUS, MAX_RSE_BONUS,
// MIN_MAINTENANCE_FACTOR) so no single spending spree can break the economy.
//
// State: `hotelState.suppliers` = { purchases, owned: {itemId: {quantity,
// firstPurchasedDay}}, ledger: {2, 3, 6}, today, lastOutcome }. Pure and
// deterministic (no rng); a hotel that never bought anything keeps no state,
// and every effect below is neutral.
import { safeArray, safeNumber, safeObject } from "../safe";
import { fundingPlan, payInvestment, treasuryOf } from "../finance/investmentFunding";
import { debitCurrentMonth } from "../finance/oneOffCosts";
import { CATALOGUE, CATEGORIES, CATEGORY_IDS, TIERS, TIER_IDS, accountClassOf, itemById } from "./suppliersData";

export { CATEGORIES, CATEGORY_IDS, TIERS, TIER_IDS };

// A local, minimal toIsoDate: NOT imported from hotelEvents/hotelEventsEngine.js
// on purpose, which itself imports maintenanceCostEngine.js -- and
// maintenanceCostEngine.js imports this file's supplierMaintenanceFactor(),
// so borrowing hotelEventsEngine's would create an import cycle.
function toIsoDate(value) {
  const date = new Date(value);
  return (Number.isNaN(date.getTime()) ? new Date() : date).toISOString().slice(0, 10);
}

export const MAX_REPUTATION_BONUS = 5;
export const MAX_RSE_BONUS = 30;
export const MIN_MAINTENANCE_FACTOR = 0.5; // upkeep can never fall below half, however much is bought

// ---- state ------------------------------------------------------------------------------

const EMPTY_LEDGER = { 2: 0, 3: 0, 6: 0 };

function state(hotelState) {
  const source = safeObject(safeObject(hotelState).suppliers);
  return {
    purchases: safeArray(source.purchases),
    owned: safeObject(source.owned),
    ledger: { ...EMPTY_LEDGER, ...safeObject(source.ledger) },
    today: source.today || null,
    lastOutcome: source.lastOutcome || null,
  };
}

function write(hotelState, patch) {
  return { ...safeObject(hotelState), suppliers: { ...safeObject(safeObject(hotelState).suppliers), ...patch } };
}

export const purchaseHistory = (hotelState) => state(hotelState).purchases;
export const ledgerOf = (hotelState) => state(hotelState).ledger;
export const lastOutcome = (hotelState) => state(hotelState).lastOutcome;

export function ownedQuantity(hotelState, itemId) {
  return safeNumber(state(hotelState).owned[itemId]?.quantity, 0);
}
export const isOwned = (hotelState, itemId) => ownedQuantity(hotelState, itemId) > 0;
export const ownedItemIds = (hotelState) => Object.keys(state(hotelState).owned).filter((itemId) => isOwned(hotelState, itemId));

// ---- pricing a cart -----------------------------------------------------------------------

// A cart is [{ itemId, quantity }]. Unknown items and non-positive quantities
// are dropped, so a stray line never blocks (or corrupts) the whole order.
function pricedLines(cart) {
  return safeArray(cart)
    .map((line) => ({ item: itemById(line?.itemId), quantity: Math.floor(safeNumber(line?.quantity, 0)) }))
    .filter(({ item, quantity }) => item && quantity > 0)
    .map(({ item, quantity }) => {
      const accountClass = accountClassOf(item.accountCode);
      const lineTotal = Math.round(item.price * quantity + safeNumber(item.deliveryFee, 0) + safeNumber(item.installationCost, 0));
      return { itemId: item.id, name: item.name, category: item.category, quantity, unitPrice: item.price, accountCode: item.accountCode, accountClass, lineTotal };
    });
}

// The cart, priced and split by PCMN class: { lines, total, byClass: {2, 3, 6} }.
export function priceCart(cart) {
  const lines = pricedLines(cart);
  const byClass = { ...EMPTY_LEDGER };
  lines.forEach((line) => {
    byClass[line.accountClass] = (byClass[line.accountClass] || 0) + line.lineTotal;
  });
  const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return { lines, total, byClass };
}

// Classe 2 + 3 draw on capital then treasury (like any investment); Classe 6
// draws on the treasury alone, on top of what Classe 2/3 already used.
export function canAffordCart(hotelState, cart) {
  const { byClass } = priceCart(cart);
  const investable = safeNumber(byClass[2], 0) + safeNumber(byClass[3], 0);
  const charge = safeNumber(byClass[6], 0);
  const plan = fundingPlan(hotelState, investable);
  if (!plan.affordable) return false;
  return treasuryOf(hotelState) - plan.fromTreasury >= charge;
}

// ---- the order ------------------------------------------------------------------------------

// Places the order: pays for it (Classe 2/3 as an investment, Classe 6 as a
// straight expense), books every line to the asset or stock ledger, and marks
// each item's type as owned. A no-op unless the cart prices to at least one
// line and the hotel can afford it.
export function purchaseItems(hotelBundle, cart, { day = 0, date } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const priced = priceCart(cart);
  if (priced.lines.length === 0 || !canAffordCart(hotelState, cart)) return bundle;

  const investable = safeNumber(priced.byClass[2], 0) + safeNumber(priced.byClass[3], 0);
  const charge = safeNumber(priced.byClass[6], 0);
  const { hotelState: afterInvestment, fromCapital, fromTreasury: investedFromTreasury } = payInvestment(hotelState, investable);
  const afterCharge = charge > 0 ? debitCurrentMonth(afterInvestment, charge) : afterInvestment;

  const current = state(hotelState);
  const owned = { ...current.owned };
  priced.lines.forEach((line) => {
    const existing = owned[line.itemId];
    owned[line.itemId] = { quantity: safeNumber(existing?.quantity, 0) + line.quantity, firstPurchasedDay: existing ? existing.firstPurchasedDay : day };
  });

  const ledger = { ...current.ledger };
  Object.keys(priced.byClass).forEach((cls) => {
    ledger[cls] = safeNumber(ledger[cls], 0) + safeNumber(priced.byClass[cls], 0);
  });

  const order = { id: `order:${current.purchases.length + 1}`, day, date: date ? toIsoDate(date) : null, lines: priced.lines, total: priced.total, fromCapital, fromTreasury: investedFromTreasury + charge };

  return {
    ...bundle,
    hotelState: write(afterCharge, {
      purchases: [...current.purchases, order].slice(-30),
      owned,
      ledger,
      today: { date: date ? toIsoDate(date) : null, day, order },
      lastOutcome: { type: "purchase", day, text: `Commande de ${priced.lines.length} article${priced.lines.length > 1 ? "s" : ""} passée pour ${Math.round(priced.total).toLocaleString("fr-FR")} € auprès de ${new Set(priced.lines.map((line) => itemById(line.itemId)?.supplierName)).size} fournisseur${new Set(priced.lines.map((line) => itemById(line.itemId)?.supplierName)).size > 1 ? "s" : ""}.` },
    }),
  };
}

// ---- effects (neutral without a purchase) --------------------------------------------------

function ownedImpacts(hotelState) {
  return ownedItemIds(hotelState)
    .map((itemId) => itemById(itemId)?.impact)
    .filter(Boolean);
}

export function supplierReputationBonus(hotelState) {
  const total = ownedImpacts(hotelState).reduce((sum, impact) => sum + safeNumber(impact.reputation, 0), 0);
  return Math.min(MAX_REPUTATION_BONUS, Math.round(total * 100) / 100);
}

export function supplierSustainabilityBonus(hotelState) {
  const total = ownedImpacts(hotelState).reduce((sum, impact) => sum + safeNumber(impact.rse, 0), 0);
  return Math.min(MAX_RSE_BONUS, total);
}

// A multiplier on the daily upkeep bill (1 = no change), the same shape
// majorProjectsEngine.js's ecoUpkeepFactor() already feeds maintenanceCostEngine.js.
export function supplierMaintenanceFactor(hotelState) {
  const factor = ownedImpacts(hotelState).reduce((product, impact) => product * (1 + safeNumber(impact.maintenanceCost, 0)), 1);
  return Math.max(MIN_MAINTENANCE_FACTOR, Math.round(factor * 1000) / 1000);
}

export function purchasesOn(hotelState, day) {
  return purchaseHistory(hotelState).filter((order) => order.day === day);
}

// The order just placed, as a line of the daily review.
export function supplierNewsOn(hotelState, date) {
  const today = state(hotelState).today;
  if (!today || today.date !== toIsoDate(date)) return [];
  return [`Commande fournisseurs livrée : ${today.order.lines.length} article${today.order.lines.length > 1 ? "s" : ""} pour ${Math.round(today.order.total).toLocaleString("fr-FR")} €.`];
}

// ---- how the interface reads it ----------------------------------------------------------------------------

// The catalogue as the panel shows it, optionally filtered by category
// and/or price tier, each item flagged with whether it is owned and whether
// the hotel could afford one more right now.
export function describeCatalogue(hotelState, { category, tier } = {}) {
  const items = CATALOGUE.filter((item) => (!category || item.category === category) && (!tier || item.tier === tier));
  return items.map((item) => ({
    ...item,
    accountClass: accountClassOf(item.accountCode),
    owned: isOwned(hotelState, item.id),
    ownedQuantity: ownedQuantity(hotelState, item.id),
    affordable: canAffordCart(hotelState, [{ itemId: item.id, quantity: 1 }]),
  }));
}

// The cart as the panel shows it: priced lines, the total, and why it
// couldn't be validated (empty, or unaffordable).
export function describeCart(hotelState, cart) {
  const priced = priceCart(cart);
  const affordable = priced.lines.length > 0 && canAffordCart(hotelState, cart);
  let reason = "";
  if (priced.lines.length === 0) reason = "Panier vide";
  else if (!affordable) reason = "Trésorerie insuffisante";
  return { ...priced, affordable, reason };
}

// The desk at a glance: catalogue (optionally filtered), the ledger, and the
// bonuses the hotel currently enjoys from what it has bought.
export function describeSuppliers(hotelState, { category, tier } = {}) {
  return {
    catalogue: describeCatalogue(hotelState, { category, tier }),
    categories: CATEGORY_IDS.map((id) => CATEGORIES[id]),
    tiers: TIER_IDS.map((id) => TIERS[id]),
    ledger: ledgerOf(hotelState),
    effects: {
      reputationBonus: supplierReputationBonus(hotelState),
      rseBonus: supplierSustainabilityBonus(hotelState),
      maintenanceFactor: supplierMaintenanceFactor(hotelState),
    },
    ownedCount: ownedItemIds(hotelState).length,
    lastOutcome: lastOutcome(hotelState),
  };
}

const SuppliersEngine = { purchaseItems, describeSuppliers, describeCatalogue, describeCart, canAffordCart, priceCart, supplierNewsOn, supplierReputationBonus, supplierSustainabilityBonus, supplierMaintenanceFactor };
export default SuppliersEngine;
