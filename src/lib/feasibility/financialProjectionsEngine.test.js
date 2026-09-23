import { purchaseItems } from "../suppliers/suppliersEngine";
import { takeLoan } from "../banking/bankingLoanEngine";
import {
  PROJECTION_YEARS,
  DEFAULT_GROWTH_RATES,
  DEFAULT_OCCUPANCY,
  DEFAULT_FB_TO_ROOMS_RATIO,
  DEFAULT_FINANCIAL_DEBT_DECAY,
  annualPayroll,
  annualBaseline,
  revenueForecast,
  incomeStatementForecast,
  cashFlowForecast,
  projectedBalanceSheet,
  describeProjections,
} from "./financialProjectionsEngine";

const hotel = (extra = {}) => ({ finance: { revenue: [35000], costs: [0], payroll: 9000, fixedCosts: 4000 }, expansion: { availableCapital: 0 }, ...extra });
const restaurant = (extra = {}) => ({ finance: { revenue: [0], costs: [0] }, staff: [], ...extra });
const rooms = [
  { id: 1, number: "101", type: "standard", price: 120, status: "libre" },
  { id: 2, number: "102", type: "standard", price: 120, status: "libre" },
  { id: 3, number: "201", type: "deluxe", price: 180, status: "libre" },
];

describe("financialProjectionsEngine / la masse salariale réelle", () => {
  it("annualise le payroll de l'hôtel et les salaires du personnel restaurant, chacun mensuel", () => {
    const staffed = restaurant({ staff: [{ salary: 2000 }, { salary: 1500 }] });
    expect(annualPayroll(hotel(), staffed)).toBe((9000 + 3500) * 12);
  });
});

describe("financialProjectionsEngine / la base Année 1", () => {
  it("un hôtel sans historique (Jour 0) part d'un potentiel théorique", () => {
    const base = annualBaseline({ hotelState: hotel(), restaurantState: restaurant(), rooms, day: 0 });
    const expectedHebergement = 3 * ((120 + 120 + 180) / 3) * DEFAULT_OCCUPANCY * 365;
    expect(base.hebergement).toBeCloseTo(expectedHebergement, 0);
    expect(base.restauration).toBeCloseTo(expectedHebergement * DEFAULT_FB_TO_ROOMS_RATIO, 0);
  });

  it("un hôtel avec historique réel extrapole son cumul", () => {
    const state = hotel({ finance: { revenue: [1000], costs: [0], payroll: 0, fixedCosts: 0 } });
    const base = annualBaseline({ hotelState: state, restaurantState: restaurant(), rooms, day: 10 });
    expect(base.hebergement).toBeCloseTo(1000 * (365 / 10), 6);
  });
});

describe("financialProjectionsEngine / les CHAFFs", () => {
  it("projette 5 années, chacune plus grande que la précédente au taux d'hébergement", () => {
    const forecast = revenueForecast(hotel(), { restaurantState: restaurant(), rooms, day: 0 });
    expect(forecast.map((entry) => entry.year)).toEqual(PROJECTION_YEARS);
    for (let i = 1; i < forecast.length; i += 1) {
      expect(forecast[i].hebergement).toBeGreaterThan(forecast[i - 1].hebergement);
    }
    expect(forecast[0].hebergement * (1 + DEFAULT_GROWTH_RATES.hebergement)).toBeCloseTo(forecast[1].hebergement, 1);
  });

  it("des taux de croissance personnalisés changent la trajectoire", () => {
    const flat = revenueForecast(hotel(), { restaurantState: restaurant(), rooms, day: 0 }, { ...DEFAULT_GROWTH_RATES, hebergement: 0 });
    expect(flat[4].hebergement).toBeCloseTo(flat[0].hebergement, 6);
  });
});

describe("financialProjectionsEngine / le compte de résultat prévisionnel", () => {
  it("l'EBITDA et le résultat net se déduisent des mêmes charges", () => {
    const forecast = incomeStatementForecast(hotel(), { restaurantState: restaurant(), rooms, day: 0 });
    forecast.forEach((year) => {
      expect(year.resultatNet).toBeCloseTo(year.produits.total - year.charges.total, 6);
      expect(year.ebitda).toBeCloseTo(year.produits.total - year.charges.achatsFB - year.charges.variationStocks - year.charges.sbd - year.charges.masseSalariale, 6);
    });
  });

  it("les charges financières décroissent : les emprunts courts se remboursent", () => {
    let state = hotel();
    state = takeLoan({ hotelState: state }, "investment", 30000, { day: 1 }).hotelState;
    const forecast = incomeStatementForecast(state, { restaurantState: restaurant(), rooms, day: 1 });
    expect(forecast[1].charges.interets).toBeCloseTo(forecast[0].charges.interets * DEFAULT_FINANCIAL_DEBT_DECAY, 6);
  });

  it("l'amortissement reste stable d'une année à l'autre (le parc ne change pas tout seul)", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: 1 }).hotelState;
    const forecast = incomeStatementForecast(state, { restaurantState: restaurant(), rooms, day: 1 });
    expect(forecast[0].charges.amortissements).toBe(forecast[4].charges.amortissements);
    expect(forecast[0].charges.amortissements).toBeGreaterThan(0);
  });
});

describe("financialProjectionsEngine / le plan de trésorerie", () => {
  it("cumule le cash-flow année après année", () => {
    const forecast = cashFlowForecast(hotel(), { restaurantState: restaurant(), rooms, day: 0 });
    let running = 0;
    forecast.forEach((entry) => {
      running += entry.cashFlow;
      expect(entry.cumulative).toBeCloseTo(running, 1);
    });
  });

  it("réintègre l'amortissement (non monétaire) au résultat net", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: 1 }).hotelState;
    const [year1] = cashFlowForecast(state, { restaurantState: restaurant(), rooms, day: 1 });
    expect(year1.cashFlow).toBe(year1.resultatNet + year1.amortissements - year1.variationStocks);
  });
});

describe("financialProjectionsEngine / le bilan prévisionnel", () => {
  it("s'équilibre à l'année 3 et à l'année 5", () => {
    const args = { restaurantState: restaurant(), rooms, day: 0 };
    expect(projectedBalanceSheet(hotel(), args, 3).isBalanced).toBe(true);
    expect(projectedBalanceSheet(hotel(), args, 5).isBalanced).toBe(true);
  });

  it("reste équilibré une fois un investissement et un emprunt réalisés", () => {
    let state = hotel();
    state = takeLoan({ hotelState: state }, "cash", 5000, { day: 1 }).hotelState;
    state = purchaseItems({ hotelState: state }, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: 1 }).hotelState;
    const args = { restaurantState: restaurant(), rooms, day: 1 };
    const year3 = projectedBalanceSheet(state, args, 3);
    expect(year3.isBalanced).toBe(true);
    expect(year3.actif.immobilisationsNet).toBeLessThanOrEqual(520);
  });

  it("l'emprunt décroît, jamais sous zéro", () => {
    let state = hotel();
    state = takeLoan({ hotelState: state }, "cash", 5000, { day: 1 }).hotelState;
    const args = { restaurantState: restaurant(), rooms, day: 1 };
    const year1 = projectedBalanceSheet(state, args, 1);
    const year5 = projectedBalanceSheet(state, args, 5);
    expect(year5.passif.emprunts).toBeLessThan(year1.passif.emprunts);
    expect(year5.passif.emprunts).toBeGreaterThanOrEqual(0);
  });
});

describe("financialProjectionsEngine / describeProjections", () => {
  it("réunit tout : CHAFFs, compte de résultat, trésorerie, bilans", () => {
    const described = describeProjections(hotel(), { restaurantState: restaurant(), rooms, day: 0 });
    expect(described.revenue).toHaveLength(5);
    expect(described.incomeStatement).toHaveLength(5);
    expect(described.cashFlow).toHaveLength(5);
    expect(described.balanceSheetYear3.year).toBe(3);
    expect(described.balanceSheetYear5.year).toBe(5);
  });
});

describe("financialProjectionsEngine / purity", () => {
  it("is deterministic and leaves its input alone", () => {
    const state = purchaseItems({ hotelState: hotel() }, [{ itemId: "furniture-rooms-entry", quantity: 1 }], { day: 1 }).hotelState;
    const frozen = JSON.stringify(state);
    const args = { restaurantState: restaurant(), rooms, day: 1 };
    expect(describeProjections(state, args)).toEqual(describeProjections(state, args));
    expect(JSON.stringify(state)).toBe(frozen);
  });
});
