import { purchaseItems } from "../suppliers/suppliersEngine";
import { startProject, advanceMajorProjects } from "../expansion/majorProjectsEngine";
import { startUpgrade, advanceZoneUpgrades } from "../zones/zoneUpgradesEngine";
import { takeLoan } from "../banking/bankingLoanEngine";
import { itemById } from "../suppliers/suppliersData";
import {
  DEPRECIATION_YEARS,
  SYNTHETIC_ACCOUNTS,
  immobilisationLots,
  immobilisationsOf,
  stocksOf,
  treasuryAssetsOf,
  assetsOf,
  overdraftOf,
  liabilitiesOf,
  incomeStatementOf,
  describeAccounting,
} from "./accountingEngine";

const hotel = (extra = {}) => ({ finance: { revenue: [500000], costs: [0] }, expansion: { availableCapital: 0 }, structure: { starRating: 3 }, ...extra });
const restaurant = (extra = {}) => ({ finance: { revenue: [0], costs: [0] }, ...extra });

describe("accountingEngine / inert without any activity", () => {
  it("an untouched hotel has no immobilisations, no stocks, no debt", () => {
    const state = hotel();
    expect(immobilisationsOf(state).gross).toBe(0);
    expect(stocksOf(state).total).toBe(0);
    expect(liabilitiesOf(state).loans).toBe(0);
    expect(overdraftOf(state)).toBe(0);
  });

  it("assets are exactly the treasury, and equity absorbs it all", () => {
    const state = hotel({ finance: { revenue: [35000], costs: [0] } });
    const assets = assetsOf(state);
    expect(assets.total).toBe(35000);
    const liabilities = liabilitiesOf(state);
    expect(liabilities.equity).toBe(35000);
    expect(liabilities.loans).toBe(0);
    expect(liabilities.overdraft).toBe(0);
    expect(liabilities.total).toBe(assets.total);
  });

  it("an empty career has no revenue, no charges, no result", () => {
    const income = incomeStatementOf(hotel({ finance: { revenue: [0], costs: [0] } }), restaurant());
    expect(income.produits.total).toBe(0);
    expect(income.charges.total).toBe(0);
    expect(income.resultatNet).toBe(0);
  });
});

describe("accountingEngine / Classe 2 immobilisations", () => {
  it("a supplier's Classe 2 purchase becomes a gross immobilisation, at its own account", () => {
    const item = itemById("furniture-rooms-entry"); // 420 + 60 + 40 = 520, account 24010
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: item.id, quantity: 1 }], { day: 1 }).hotelState;
    const immo = immobilisationsOf(state, 1);
    expect(immo.gross).toBe(520);
    expect(immo.byAccount).toEqual([{ accountCode: 24010, label: item.name, gross: 520, depreciation: 0, net: 520 }]);
  });

  it("a Classe 3 purchase is never an immobilisation", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "linens-sheets-entry", quantity: 1 }], { day: 1 }).hotelState;
    expect(immobilisationsOf(state, 1).gross).toBe(0);
  });

  it("a built major project counts at its real, built size's cost", () => {
    let state = startProject({ hotelState: hotel() }, "wing", { day: 1, size: 20 }).hotelState; // 20 rooms, 150 000, 5 days of works
    state = advanceMajorProjects({ hotelState: state, rooms: [] }, { day: 6 }).hotelState; // completesOnDay: 1 + 5
    const lots = immobilisationLots(state);
    const wing = lots.find((lot) => lot.accountCode === SYNTHETIC_ACCOUNTS.majorProject.code);
    expect(wing).toMatchObject({ cost: 150000, acquiredOnDay: 6 });
  });

  it("an installed zone upgrade counts at its own cost", () => {
    let state = startUpgrade({ hotelState: hotel() }, "lobby-kiosk", { day: 2 }).hotelState; // 6 000, 1 day
    state = advanceZoneUpgrades(state, 3);
    const lots = immobilisationLots(state);
    expect(lots.find((lot) => lot.accountCode === SYNTHETIC_ACCOUNTS.zoneUpgrade.code)).toMatchObject({ cost: 6000, acquiredOnDay: 3 });
  });

  it("depreciates straight-line, capped at cost, by what it is", () => {
    const item = itemById("electronics-tv-luxury"); // electronics: 4-year useful life
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: item.id, quantity: 1 }], { day: 0 }).hotelState;
    const cost = item.price + item.deliveryFee + item.installationCost;
    const usefulLifeDays = DEPRECIATION_YEARS.electronics * 365;
    const half = immobilisationsOf(state, Math.round(usefulLifeDays / 2));
    expect(half.depreciation).toBeCloseTo(cost / 2, 1);
    const overTheHill = immobilisationsOf(state, usefulLifeDays * 3);
    expect(overTheHill.depreciation).toBe(cost); // never more than what it cost
    expect(overTheHill.net).toBe(0);
  });

  it("several units of the same account combine under it", () => {
    const item = itemById("furniture-rooms-entry");
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: item.id, quantity: 3 }], { day: 1 }).hotelState;
    const immo = immobilisationsOf(state, 1);
    expect(immo.byAccount).toHaveLength(1);
    // delivery/installation are billed once per line, not per unit.
    expect(immo.byAccount[0].gross).toBe(item.price * 3 + item.deliveryFee + item.installationCost);
  });
});

describe("accountingEngine / Classe 3 stocks", () => {
  it("adds up every Classe 3 purchase, by account", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "linens-sheets-entry", quantity: 2 }, { itemId: "food-meat-standard", quantity: 1 }], { day: 1 }).hotelState;
    const stocks = stocksOf(state);
    const linens = itemById("linens-sheets-entry");
    const meat = itemById("food-meat-standard");
    // delivery is billed once per line, not per unit.
    expect(stocks.total).toBe(linens.price * 2 + linens.deliveryFee + meat.price + meat.deliveryFee);
    expect(stocks.byAccount.map((entry) => entry.accountCode).sort()).toEqual([300, 3400]);
  });
});

describe("accountingEngine / trésorerie", () => {
  it("counts the account and the still-unspent capital pot", () => {
    const state = hotel({ finance: { revenue: [10000], costs: [0] }, expansion: { availableCapital: 5000 } });
    expect(treasuryAssetsOf(state)).toEqual({ cash: 10000, capital: 5000, total: 15000 });
  });

  it("never counts a negative account as an asset", () => {
    const state = hotel({ finance: { revenue: [0], costs: [3000] } });
    expect(treasuryAssetsOf(state).cash).toBe(0);
    expect(overdraftOf(state)).toBe(3000);
  });
});

describe("accountingEngine / liabilities and the balance", () => {
  it("a loan is a Classe 1 debt", () => {
    const state = takeLoan({ hotelState: hotel() }, "cash", 5000, { day: 1 }).hotelState;
    expect(liabilitiesOf(state).loans).toBe(5000); // the loan's principal, untouched on day 1
  });

  it("equity is the plug: Total Actif always equals Total Passif", () => {
    let state = hotel({ finance: { revenue: [200000], costs: [0] } });
    state = takeLoan({ hotelState: state }, "investment", 30000, { day: 1 }).hotelState;
    state = purchaseItems({ hotelState: state }, [{ itemId: "furniture-rooms-entry", quantity: 2 }, { itemId: "food-wine-standard", quantity: 1 }], { day: 1 }).hotelState;
    const assets = assetsOf(state, 1);
    const liabilities = liabilitiesOf(state, 1);
    expect(liabilities.total).toBeCloseTo(assets.total, 6);
  });

  it("holds even when the account is overdrawn", () => {
    const state = hotel({ finance: { revenue: [0], costs: [4000] } });
    const assets = assetsOf(state);
    const liabilities = liabilitiesOf(state);
    expect(liabilities.overdraft).toBe(4000);
    expect(liabilities.total).toBeCloseTo(assets.total, 6);
  });
});

describe("accountingEngine / the income statement", () => {
  it("704 is the hotel's own revenue, 702/703 the restaurant's", () => {
    const income = incomeStatementOf(hotel({ finance: { revenue: [12000], costs: [0] } }), restaurant({ finance: { revenue: [3000], costs: [0] } }));
    expect(income.produits).toMatchObject({ hebergement: 12000, restauration: 3000, servicesAnnexes: 0, total: 15000 });
  });

  it("600 is what was spent on food & drink, from the suppliers' own purchase history", () => {
    const state = purchaseItems({ hotelState: hotel({ finance: { revenue: [10000], costs: [0] } }) }, [{ itemId: "food-meat-standard", quantity: 1 }], { day: 1 }).hotelState;
    const meat = itemById("food-meat-standard");
    const income = incomeStatementOf(state, restaurant(), 1);
    expect(income.charges.achatsFB).toBe(meat.price + meat.deliveryFee);
  });

  it("Classe 2/3 purchases are never counted twice as an operating charge", () => {
    // The treasury pays for the furniture (a real cash cost, in finance.costs),
    // but its price must not also show up as a Classe 6 operating charge --
    // it is an asset, amortised through 630 instead.
    const before = hotel({ finance: { revenue: [10000], costs: [0] } });
    const state = purchaseItems({ hotelState: before }, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: 1 }).hotelState;
    const income = incomeStatementOf(state, restaurant(), 1);
    expect(income.charges.masseSalarialeEtAutres).toBe(0);
    expect(income.charges.achatsFB).toBe(0);
    expect(income.charges.servicesEtBiensDivers).toBe(0);
  });

  it("650 is the bank's own cumulative interest", () => {
    let state = takeLoan({ hotelState: hotel({ finance: { revenue: [10000], costs: [0] } }) }, "cash", 9000, { day: 0 }).hotelState;
    // Advance a day by hand: the loan's own tests cover advanceBanking() in
    // detail; here only the accounting engine's reading of the ledger matters.
    state = { ...state, banking: { ...state.banking, ledger: { ...state.banking.ledger, interest: 36 } } };
    expect(incomeStatementOf(state, restaurant(), 1).charges.interets).toBe(36);
  });

  it("real operating cash charges that are not otherwise named fall into 620", () => {
    const state = hotel({ finance: { revenue: [10000], costs: [1500] } }); // 1500 EUR of "something" spent, unexplained
    const income = incomeStatementOf(state, restaurant(), 0);
    expect(income.charges.masseSalarialeEtAutres).toBe(1500);
    expect(income.charges.total).toBe(1500);
  });

  it("le résultat net est produits moins charges", () => {
    const state = hotel({ finance: { revenue: [10000], costs: [4000] } });
    const income = incomeStatementOf(state, restaurant(), 0);
    expect(income.resultatNet).toBe(income.produits.total - income.charges.total);
  });
});

describe("accountingEngine / the desk", () => {
  it("gives the balance sheet, the income statement, and says the balance holds", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: 1 }).hotelState;
    const described = describeAccounting(state, restaurant(), { day: 1 });
    expect(described.isBalanced).toBe(true);
    expect(described.assets.total).toBeCloseTo(described.liabilities.total, 6);
    expect(described.labels[704]).toMatch(/Hébergement/);
  });

  it("copes with junk", () => {
    expect(() => describeAccounting(undefined, undefined, { day: 0 })).not.toThrow();
    expect(describeAccounting(undefined, undefined, { day: 0 }).isBalanced).toBe(true);
  });
});

describe("accountingEngine / purity", () => {
  it("leaves its input alone and is deterministic", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: 1 }).hotelState;
    const frozen = JSON.stringify(state);
    const first = describeAccounting(state, restaurant(), { day: 5 });
    const second = describeAccounting(state, restaurant(), { day: 5 });
    expect(first).toEqual(second);
    expect(JSON.stringify(state)).toBe(frozen);
  });
});
