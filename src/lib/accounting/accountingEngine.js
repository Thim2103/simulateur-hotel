// Bilan Comptable Double-Vue & Compte de Résultat: a real, PCMN-structured
// balance sheet and income statement, computed live from what every other
// engine already tracks -- no state of its own, purely derived (like
// describeBanking()/describeSuppliers()), so it can never drift out of sync
// with the hotel it describes.
//
// SOURCES. Each PCMN class reads from the engine that actually owns the
// figure:
//   Classe 2  immobilisations -- suppliers' Classe 2 purchases
//             (lib/suppliers/), built major projects (lib/expansion/
//             majorProjectsEngine.js), installed zone upgrades (lib/zones/)
//             and built floors (lib/expansion/hotelExpansionEngine.js)
//   Classe 3  stocks          -- suppliers' Classe 3 purchases (linens,
//             food & drink)
//   Classe 5  trésorerie      -- the account (lib/finance/investmentFunding.js)
//   Classe 1  capital/emprunts -- outstanding bank loans (lib/banking/) for
//             the debt half; capitaux propres is the balancing figure that
//             makes Total Actif = Total Passif (see below)
//   Classe 4  dettes          -- an overdrawn account, the only short-term
//             debt this simulator tracks
//   Classe 6  charges / Classe 7 produits -- see incomeStatementOf()'s own
//             docstring for how each PCMN line is built
//
// AMORTISSEMENTS (630). Every Classe 2 immobilisation depreciates straight-
// line over a useful life that depends on what it is (DEPRECIATION_YEARS
// below), capped at its cost -- so "Immobilisations nettes" falls over time
// exactly like a real fixed-asset register, without this simulator needing
// to track a depreciation schedule of its own: it is entirely recomputed
// from each asset's cost and acquisition day.
//
// THE BALANCE ALWAYS HOLDS. Capitaux propres (Classe 1) is defined as Total
// Actif − Emprunts − Dettes: not a coincidence but the textbook definition
// of equity, so Total Actif = Total Passif by construction, whatever was
// bought, borrowed or earned. describeAccounting()'s `isBalanced` re-checks
// it anyway (to 1 cent, for rounding), as a safety net.
import { safeArray, safeNumber } from "../safe";
import { capitalOf, balanceOf } from "../finance/investmentFunding";
import { outstandingDebt, describeBanking } from "../banking/bankingLoanEngine";
import { purchaseHistory, ledgerOf as supplierLedgerOf } from "../suppliers/suppliersEngine";
import { describeProjects, projectCost } from "../expansion/majorProjectsEngine";
import { UPGRADES, isInstalled, installedOn } from "../zones/zoneUpgradesEngine";
import { expansionFloors, FLOOR_BASE_COST, FLOOR_COST_STEP } from "../expansion/hotelExpansionEngine";
import { maintenanceSpent } from "../maintenance/maintenanceCostEngine";

const YEAR_DAYS = 365;

// How long a Classe 2 asset takes to fully depreciate, by what bought it.
export const DEPRECIATION_YEARS = {
  furniture: 10,
  equipment: 8,
  tableware: 5,
  electronics: 4,
  decor: 10,
  majorProject: 20,
  zoneUpgrade: 10,
  floor: 25,
};
const DEFAULT_DEPRECIATION_YEARS = 8;

const sum = (values) => safeArray(values).reduce((total, value) => total + safeNumber(value, 0), 0);

// One depreciable lot: { label, accountCode, cost, acquiredOnDay, usefulLifeDays }.
function usefulLifeDaysFor(kind) {
  return (DEPRECIATION_YEARS[kind] || DEFAULT_DEPRECIATION_YEARS) * YEAR_DAYS;
}

// ---- Classe 2: immobilisations, lot by lot (each with its own age) -------------------------

// The custom, non-catalogue PCMN codes this engine assigns to what suppliers.js
// doesn't itself price: a major project, a zone upgrade, a new floor.
export const SYNTHETIC_ACCOUNTS = {
  majorProject: { code: 2200, label: "Constructions & aménagements majeurs" },
  zoneUpgrade: { code: 2250, label: "Installations, machines & outillage" },
  floor: { code: 2210, label: "Constructions — extension du bâtiment" },
};

function supplierImmobilisationLots(hotelState) {
  return purchaseHistory(hotelState)
    .flatMap((order) => order.lines.map((line) => ({ ...line, day: order.day })))
    .filter((line) => line.accountClass === 2)
    .map((line) => ({
      label: line.name,
      accountCode: line.accountCode,
      cost: line.lineTotal,
      acquiredOnDay: line.day,
      usefulLifeDays: usefulLifeDaysFor(line.category),
    }));
}

function projectImmobilisationLots(hotelState) {
  return describeProjects(hotelState)
    .projects.filter((project) => project.built)
    .map((project) => ({
      label: project.label,
      accountCode: SYNTHETIC_ACCOUNTS.majorProject.code,
      cost: projectCost(project.id, project.builtSize),
      acquiredOnDay: project.builtOnDay,
      usefulLifeDays: usefulLifeDaysFor("majorProject"),
    }));
}

function zoneUpgradeImmobilisationLots(hotelState) {
  return Object.keys(UPGRADES)
    .filter((id) => isInstalled(hotelState, id))
    .map((id) => ({
      label: UPGRADES[id].name,
      accountCode: SYNTHETIC_ACCOUNTS.zoneUpgrade.code,
      cost: UPGRADES[id].cost,
      acquiredOnDay: installedOn(hotelState, id),
      usefulLifeDays: usefulLifeDaysFor("zoneUpgrade"),
    }));
}

function floorImmobilisationLots(hotelState) {
  return expansionFloors(hotelState)
    .map((floor, index) => ({ floor, index }))
    .filter(({ floor }) => floor.status === "built")
    .map(({ floor, index }) => ({
      label: `Étage ${floor.level}`,
      accountCode: SYNTHETIC_ACCOUNTS.floor.code,
      cost: FLOOR_BASE_COST + FLOOR_COST_STEP * index,
      acquiredOnDay: floor.builtOnDay,
      usefulLifeDays: usefulLifeDaysFor("floor"),
    }));
}

// Every Classe 2 lot the hotel has ever acquired, whatever bought it.
export function immobilisationLots(hotelState) {
  return [...supplierImmobilisationLots(hotelState), ...projectImmobilisationLots(hotelState), ...zoneUpgradeImmobilisationLots(hotelState), ...floorImmobilisationLots(hotelState)];
}

// Straight-line, capped at cost; a lot with no known acquisition day (should
// not happen, but hotelState can be adjusted by hand in tests) depreciates
// nothing rather than throw.
function depreciationOf(lot, day) {
  if (!Number.isFinite(lot.acquiredOnDay) || !Number.isFinite(day)) return 0;
  const age = Math.max(0, day - lot.acquiredOnDay);
  return Math.min(lot.cost, (lot.cost * age) / lot.usefulLifeDays);
}

// ---- assets ----------------------------------------------------------------------------------

// { gross, depreciation, net, byAccount: [{accountCode, label, gross, depreciation, net}] }.
export function immobilisationsOf(hotelState, day = 0) {
  const lots = immobilisationLots(hotelState);
  const gross = sum(lots.map((lot) => lot.cost));
  const depreciation = sum(lots.map((lot) => depreciationOf(lot, day)));
  const byAccountMap = new Map();
  lots.forEach((lot) => {
    const key = lot.accountCode;
    const entry = byAccountMap.get(key) || { accountCode: lot.accountCode, label: lot.label, gross: 0, depreciation: 0 };
    entry.gross += lot.cost;
    entry.depreciation += depreciationOf(lot, day);
    // A shared account (e.g. two pieces of furniture, both 24010) keeps the
    // label of whichever the player bought first -- good enough to read.
    byAccountMap.set(key, entry);
  });
  const byAccount = [...byAccountMap.values()].map((entry) => ({ ...entry, net: Math.round((entry.gross - entry.depreciation) * 100) / 100 }));
  return { gross: Math.round(gross * 100) / 100, depreciation: Math.round(depreciation * 100) / 100, net: Math.round((gross - depreciation) * 100) / 100, byAccount };
}

// { total, byAccount: [{accountCode, label, total}] } -- suppliers' own
// Classe 3 purchases, not depleted (this simulator does not model
// consumption of stock).
export function stocksOf(hotelState) {
  const lines = purchaseHistory(hotelState)
    .flatMap((order) => order.lines)
    .filter((line) => line.accountClass === 3);
  const byAccountMap = new Map();
  lines.forEach((line) => {
    const entry = byAccountMap.get(line.accountCode) || { accountCode: line.accountCode, label: line.name, total: 0 };
    entry.total += line.lineTotal;
    byAccountMap.set(line.accountCode, entry);
  });
  return { total: safeNumber(supplierLedgerOf(hotelState)[3], 0), byAccount: [...byAccountMap.values()] };
}

// { cash, capital, total } -- capital (expansion.availableCapital, still
// unspent) counts as cash-like: it is real money the hotel controls, just
// earmarked for growth.
export function treasuryAssetsOf(hotelState) {
  const cash = Math.max(0, balanceOf(hotelState));
  const capital = capitalOf(hotelState);
  return { cash: Math.round(cash * 100) / 100, capital: Math.round(capital * 100) / 100, total: Math.round((cash + capital) * 100) / 100 };
}

export function assetsOf(hotelState, day = 0) {
  const immobilisations = immobilisationsOf(hotelState, day);
  const stocks = stocksOf(hotelState);
  const treasury = treasuryAssetsOf(hotelState);
  return { immobilisations, stocks, treasury, total: Math.round((immobilisations.net + stocks.total + treasury.total) * 100) / 100 };
}

// ---- liabilities & equity ----------------------------------------------------------------------

export function overdraftOf(hotelState) {
  return Math.round(Math.max(0, -balanceOf(hotelState)) * 100) / 100;
}

// Capitaux propres is the plug: Total Actif − Emprunts − Dettes, so the
// balance sheet holds by construction (see this module's docstring).
export function liabilitiesOf(hotelState, day = 0) {
  const loans = Math.round(safeNumber(outstandingDebt(hotelState), 0) * 100) / 100;
  const overdraft = overdraftOf(hotelState);
  const totalAssets = assetsOf(hotelState, day).total;
  const equity = Math.round((totalAssets - loans - overdraft) * 100) / 100;
  return { equity, loans, overdraft, total: Math.round((equity + loans + overdraft) * 100) / 100 };
}

// ---- the income statement -----------------------------------------------------------------------

const categoryOf = (line) => line.category;

// Cumulative, since the career began (like every other ledger this engine
// reads). Produits: 704 hébergement (hotelState.finance.revenue -- MICE and
// upsells included, they all land there), 702/703 restauration & bar
// (restaurantState.finance.revenue; this simulator does not split the bar
// out on its own), 707 services annexes (not yet its own revenue stream --
// 0, disclosed rather than invented). Charges: what suppliers.js's Classe 3
// purchases were for (600 food & drink, part of 61 for linens), upkeep (part
// of 61), depreciation (630, from immobilisationsOf()) and loan interest
// (650, from bankingLoanEngine's own ledger) are named; every cash cost this
// simulator has ever recorded that isn't a Classe 2/3 purchase and isn't one
// of those named lines (payroll, marketing, ESG, loyalty perks, MICE
// catering, bank fees...) falls into 62 as a single, honest residual --
// exactly what a real bookkeeper does with spend nobody has coded to its own
// account yet.
export function incomeStatementOf(hotelState, restaurantState = {}, day = 0) {
  const hebergement = sum(hotelState?.finance?.revenue);
  const restauration = sum(restaurantState?.finance?.revenue);
  const servicesAnnexes = 0;
  const totalProduits = Math.round((hebergement + restauration + servicesAnnexes) * 100) / 100;

  const stockLines = purchaseHistory(hotelState).flatMap((order) => order.lines).filter((line) => line.accountClass === 3);
  const foodAndDrink = sum(stockLines.filter((line) => categoryOf(line) === "food").map((line) => line.lineTotal));
  const linens = sum(stockLines.filter((line) => categoryOf(line) === "linens").map((line) => line.lineTotal));
  const supplierCharges = sum(
    purchaseHistory(hotelState)
      .flatMap((order) => order.lines)
      .filter((line) => line.accountClass === 6)
      .map((line) => line.lineTotal)
  );

  const cashCostsTotal = sum(hotelState?.finance?.costs) + sum(restaurantState?.finance?.costs);
  const capitalizedSpend = immobilisationsOf(hotelState, day).gross + stocksOf(hotelState).total;
  const operatingCash = Math.max(0, cashCostsTotal - capitalizedSpend);

  const achatsFB = Math.round(foodAndDrink * 100) / 100;
  const servicesEtBiensDivers = Math.round((maintenanceSpent(hotelState) + linens + supplierCharges) * 100) / 100;
  const amortissements = immobilisationsOf(hotelState, day).depreciation;
  const interets = Math.round(safeNumber(describeBanking(hotelState).ledger.interest, 0) * 100) / 100;
  const masseSalarialeEtAutres = Math.round(Math.max(0, operatingCash - achatsFB - servicesEtBiensDivers - interets) * 100) / 100;
  const totalCharges = Math.round((achatsFB + servicesEtBiensDivers + masseSalarialeEtAutres + amortissements + interets) * 100) / 100;

  return {
    produits: { hebergement: Math.round(hebergement * 100) / 100, restauration: Math.round(restauration * 100) / 100, servicesAnnexes, total: totalProduits },
    charges: { achatsFB, servicesEtBiensDivers, masseSalarialeEtAutres, amortissements, interets, total: totalCharges },
    resultatNet: Math.round((totalProduits - totalCharges) * 100) / 100,
  };
}

// ---- how the interface reads it -----------------------------------------------------------------

// PCMN labels for the Expert view's fixed lines (the immobilisations'
// per-account labels come from immobilisationsOf()/stocksOf() themselves --
// each catalogue item already carries its own real account code).
export const PCMN_LABELS = {
  100: "Capitaux propres (capital & résultats cumulés)",
  173: "Emprunts à long terme",
  4300: "Découvert bancaire (dette financière court terme)",
  5500: "Trésorerie & banque",
  600: "Achats de marchandises (F&B)",
  61: "Services, fournitures et biens divers",
  620: "Masse salariale & autres charges d'exploitation",
  630: "Dotations aux amortissements",
  650: "Charges des dettes (intérêts d'emprunt)",
  702: "Chiffre d'affaires — Restauration & Bar",
  704: "Chiffre d'affaires — Hébergement",
  707: "Chiffre d'affaires — Services annexes",
};

// The whole desk at a glance: the balance sheet, the income statement, and
// whether the two sides of the balance sheet actually agree (they always
// should -- see this module's docstring -- this is the safety net).
export function describeAccounting(hotelState, restaurantState = {}, { day = 0 } = {}) {
  const assets = assetsOf(hotelState, day);
  const liabilities = liabilitiesOf(hotelState, day);
  const incomeStatement = incomeStatementOf(hotelState, restaurantState, day);
  return {
    day,
    assets,
    liabilities,
    incomeStatement,
    isBalanced: Math.abs(assets.total - liabilities.total) < 0.01,
    labels: PCMN_LABELS,
  };
}

const AccountingEngine = { describeAccounting, assetsOf, liabilitiesOf, incomeStatementOf, immobilisationsOf, stocksOf, treasuryAssetsOf, overdraftOf };
export default AccountingEngine;
