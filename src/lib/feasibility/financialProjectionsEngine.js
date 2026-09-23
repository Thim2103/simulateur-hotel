// Projections Financières & CHAFFs (TFE, Partie 2) -- a 3-to-5-year business
// plan projection, built the same way the rest of the feasibility module is:
// read today's real figures (the Bilan and Compte de Résultat,
// lib/accounting/accountingEngine.js; the depreciation plan, ./
// depreciationEngine.js; the bank's own interest, lib/banking/), annualise
// them into a Year-1 baseline, then roll them forward with a growth
// assumption per line -- no new persisted state, so a projection can never
// drift out of sync with the hotel it is projecting.
//
// THE YEAR-1 BASELINE.
//   - A hotel with real history (day > 0): today's cumulative income
//     statement, annualised (× 365 / day).
//   - A brand-new hotel (day 0, or no history yet -- exactly when a
//     feasibility study is most useful, before the hotel has even opened):
//     a theoretical potential, from the rooms it has and a target occupancy
//     (DEFAULT_OCCUPANCY), with the restaurant estimated as a share of that
//     (DEFAULT_FB_TO_ROOMS_RATIO, a common small-hotel rule of thumb).
// Masse salariale (62) is never extrapolated from the P&L's own residual --
// it reads the real configured payroll (hotelState.finance.payroll +
// restaurantState.staff's own salaries), annualised directly, so growing it
// means growing real wages, not guessing at a mixed bucket. Amortissements
// (630) hold at today's real annual dotation (the fit-out already owned does
// not change on its own across the projection). Charges financières (650)
// decay: this simulator's loans run at most 180 days, so what is owed today
// is mostly repaid well before a 5-year horizon closes.
import { safeArray, safeNumber } from "../safe";
import { incomeStatementOf, assetsOf, liabilitiesOf } from "../accounting/accountingEngine";
import { describeDepreciationPlan } from "./depreciationEngine";
import { loanInterestOn } from "../banking/bankingLoanEngine";

export const PROJECTION_YEARS = [1, 2, 3, 4, 5];
export const DEFAULT_OCCUPANCY = 0.65; // matches Game Balancing V1.0's Early Game target
export const DEFAULT_FB_TO_ROOMS_RATIO = 0.3; // a small hotel's restaurant revenue, as a share of its room revenue
export const DEFAULT_FINANCIAL_DEBT_DECAY = 0.5; // charges financières roughly halve each year: short-term loans get repaid

export const DEFAULT_GROWTH_RATES = {
  hebergement: 0.05,
  restauration: 0.04,
  servicesAnnexes: 0.03,
  achatsFB: 0.04,
  sbd: 0.02,
  masseSalariale: 0.025,
};

const sum = (values) => safeArray(values).reduce((total, value) => total + safeNumber(value, 0), 0);
const round2 = (value) => Math.round(safeNumber(value, 0) * 100) / 100;

// The real, configured payroll -- not the Compte de Résultat's residual --
// annualised: hotelState.finance.payroll is already monthly (× 12);
// restaurant staff carry their own individual monthly salaries (× 12 too).
export function annualPayroll(hotelState, restaurantState = {}) {
  const hotelMonthly = safeNumber(hotelState?.finance?.payroll, 0);
  const restaurantMonthly = sum(safeArray(restaurantState?.staff).map((person) => person.salary));
  return round2((hotelMonthly + restaurantMonthly) * 12);
}

function averageRoomPrice(rooms) {
  const bookable = safeArray(rooms).filter((room) => room.type !== "seminar" && room.type !== "conference");
  const prices = bookable.map((room) => safeNumber(room.price, 0)).filter((price) => price > 0);
  return prices.length ? sum(prices) / prices.length : 0;
}

// Year 1's baseline: real history annualised once there is any, a
// theoretical potential otherwise (see this module's docstring).
export function annualBaseline({ hotelState, restaurantState = {}, rooms = [], day = 0 } = {}) {
  const payroll = annualPayroll(hotelState, restaurantState);
  const depreciation = describeDepreciationPlan(hotelState, day).total.annualDotation;
  const interets = round2(loanInterestOn(hotelState) * 365);

  if (day > 0) {
    const income = incomeStatementOf(hotelState, restaurantState, day);
    const factor = 365 / day;
    return {
      hebergement: round2(income.produits.hebergement * factor),
      restauration: round2(income.produits.restauration * factor),
      servicesAnnexes: round2(income.produits.servicesAnnexes * factor),
      achatsFB: round2(income.charges.achatsFB * factor),
      sbd: round2(income.charges.servicesEtBiensDivers * factor),
      masseSalariale: payroll,
      amortissements: depreciation,
      interets,
    };
  }

  const bookableRooms = safeArray(rooms).filter((room) => room.type !== "seminar" && room.type !== "conference").length;
  const hebergement = round2(bookableRooms * averageRoomPrice(rooms) * DEFAULT_OCCUPANCY * 365);
  const restauration = round2(hebergement * DEFAULT_FB_TO_ROOMS_RATIO);
  return {
    hebergement,
    restauration,
    servicesAnnexes: 0,
    achatsFB: round2(restauration * 0.3), // a typical F&B cost ratio, food cost around 30 %
    sbd: round2((hebergement + restauration) * 0.15),
    masseSalariale: payroll,
    amortissements: depreciation,
    interets,
  };
}

function grown(value, rate, years) {
  return round2(value * (1 + rate) ** years);
}

// The CHAFFs: revenue by department, one column per projected year.
export function revenueForecast(hotelState, args, growthRates = DEFAULT_GROWTH_RATES) {
  const base = annualBaseline({ hotelState, ...args });
  return PROJECTION_YEARS.map((year) => {
    const hebergement = grown(base.hebergement, growthRates.hebergement, year - 1);
    const restauration = grown(base.restauration, growthRates.restauration, year - 1);
    const servicesAnnexes = grown(base.servicesAnnexes, growthRates.servicesAnnexes, year - 1);
    return { year, hebergement, restauration, servicesAnnexes, total: round2(hebergement + restauration + servicesAnnexes) };
  });
}

// The multi-year Compte de Résultat Prévisionnel: one row of PCMN charges
// per year, and the year's résultat net.
export function incomeStatementForecast(hotelState, args, growthRates = DEFAULT_GROWTH_RATES) {
  const base = annualBaseline({ hotelState, ...args });
  const revenue = revenueForecast(hotelState, args, growthRates);
  return PROJECTION_YEARS.map((year) => {
    const produits = revenue[year - 1];
    const achatsFB = grown(base.achatsFB, growthRates.achatsFB, year - 1);
    // 609: the extra stock a growing F&B throughput needs -- estimated as a
    // share of the achats' own growth, not tracked as a real depleting
    // inventory (this simulator does not model stock consumption).
    const variationStocks = round2(achatsFB - base.achatsFB > 0 ? (achatsFB - base.achatsFB) * 0.2 : 0);
    const sbd = grown(base.sbd, growthRates.sbd, year - 1);
    const masseSalariale = grown(base.masseSalariale, growthRates.masseSalariale, year - 1);
    const amortissements = base.amortissements; // the owned fit-out does not change on its own
    const interets = round2(base.interets * DEFAULT_FINANCIAL_DEBT_DECAY ** (year - 1)); // short-term loans get repaid
    const totalCharges = round2(achatsFB + variationStocks + sbd + masseSalariale + amortissements + interets);
    const ebitda = round2(produits.total - achatsFB - variationStocks - sbd - masseSalariale);
    const resultatNet = round2(produits.total - totalCharges);
    return { year, produits, charges: { achatsFB, variationStocks, sbd, masseSalariale, amortissements, interets, total: totalCharges }, ebitda, resultatNet };
  });
}

// The Plan de Trésorerie (indirect method): each year's cash-flow is its
// résultat net, with the non-cash amortissement added back and the extra
// stock (609) taken out -- the standard shortcut from résultat to cash when
// there is no accounts-receivable/payable timing to model (this simulator
// tracks neither).
export function cashFlowForecast(hotelState, args, growthRates = DEFAULT_GROWTH_RATES) {
  const statements = incomeStatementForecast(hotelState, args, growthRates);
  let cumulative = 0;
  return statements.map((statement) => {
    const cashFlow = round2(statement.resultatNet + statement.charges.amortissements - statement.charges.variationStocks);
    cumulative = round2(cumulative + cashFlow);
    return { year: statement.year, resultatNet: statement.resultatNet, amortissements: statement.charges.amortissements, variationStocks: statement.charges.variationStocks, cashFlow, cumulative };
  });
}

// The Bilan Prévisionnel at a given year: today's real balance sheet
// (accountingEngine.js), rolled forward by that year's cumulative cash-flow
// and depreciation, with the debt paid down at the same pace the projected
// charges financières assume. Capitaux propres is, as ever, the plug that
// keeps Total Actif = Total Passif.
export function projectedBalanceSheet(hotelState, args, year, growthRates = DEFAULT_GROWTH_RATES) {
  const { day = 0 } = args;
  const assets = assetsOf(hotelState, day);
  const liabilities = liabilitiesOf(hotelState, day);
  const cashFlows = cashFlowForecast(hotelState, args, growthRates).filter((entry) => entry.year <= year);
  const cumulativeCashFlow = sum(cashFlows.map((entry) => entry.cashFlow));
  const cumulativeDepreciation = sum(cashFlows.map((entry) => entry.amortissements));
  const cumulativeStockGrowth = sum(cashFlows.map((entry) => entry.variationStocks));

  const immobilisationsNet = Math.max(0, round2(assets.immobilisations.net - cumulativeDepreciation));
  const stocks = round2(assets.stocks.total + cumulativeStockGrowth);
  const tresorerie = round2(assets.treasury.total + cumulativeCashFlow);
  const totalActif = round2(immobilisationsNet + stocks + tresorerie);

  const emprunts = Math.max(0, round2(liabilities.loans * DEFAULT_FINANCIAL_DEBT_DECAY ** year));
  const dettes = liabilities.overdraft; // this simulator carries no other short-term debt forward
  const capitauxPropres = round2(totalActif - emprunts - dettes);

  return {
    year,
    actif: { immobilisationsNet, stocks, tresorerie, total: totalActif },
    passif: { capitauxPropres, emprunts, dettes, total: round2(capitauxPropres + emprunts + dettes) },
    isBalanced: Math.abs(totalActif - (capitauxPropres + emprunts + dettes)) < 0.01,
  };
}

// The whole projection at a glance: CHAFFs, income statement, cash-flow, and
// the balance sheet at year 3 and year 5.
export function describeProjections(hotelState, args = {}, growthRates = DEFAULT_GROWTH_RATES) {
  return {
    growthRates,
    revenue: revenueForecast(hotelState, args, growthRates),
    incomeStatement: incomeStatementForecast(hotelState, args, growthRates),
    cashFlow: cashFlowForecast(hotelState, args, growthRates),
    balanceSheetYear3: projectedBalanceSheet(hotelState, args, 3, growthRates),
    balanceSheetYear5: projectedBalanceSheet(hotelState, args, 5, growthRates),
  };
}

const FinancialProjectionsEngine = { annualBaseline, annualPayroll, revenueForecast, incomeStatementForecast, cashFlowForecast, projectedBalanceSheet, describeProjections };
export default FinancialProjectionsEngine;
