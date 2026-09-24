// Analyse Financière & KPIs Hôteliers (TFE, Partie 2) -- the masses
// bilantaires (FR/BFR/TN), the standard financial ratios and the hotel
// industry's own KPIs, all read live from the Bilan (lib/accounting/
// accountingEngine.js) and today's rooms -- no state of its own, no
// projection: this is what the hotel's books say right now.
//
// FR/BFR/TN. Fonds de Roulement (long-term resources left over once
// immobilisations are financed) minus Besoin en Fonds de Roulement (what
// working capital ties up -- this simulator tracks no accounts receivable/
// payable, so BFR reduces to the stocks on hand) should equal the Trésorerie
// Nette the Bilan already shows: a real consistency check, not just a
// formula.
//
// KPIS HÔTELIERS. Computed from today's rooms (status, price) the same way
// lib/dashboard/statusSummary.js's occupancyOf() already reads them --
// reused here, not reimplemented, so "occupancy" always means the same
// thing across every screen of the app.
import { safeArray, safeNumber } from "../safe.js";
import { assetsOf, liabilitiesOf, incomeStatementOf } from "../accounting/accountingEngine";
import { occupancyOf } from "../dashboard/statusSummary";

const round2 = (value) => Math.round(safeNumber(value, 0) * 100) / 100;
const ratioOrNull = (numerator, denominator) => (denominator > 0 ? round2(numerator / denominator) : null);

// { fr, bfr, tn, isConsistent } -- isConsistent checks FR − BFR really is
// the account balance the Bilan shows (to 1 cent, for rounding).
export function massesBilantaires(hotelState, day = 0) {
  const assets = assetsOf(hotelState, day);
  const liabilities = liabilitiesOf(hotelState, day);
  const fr = round2(liabilities.equity + liabilities.loans - assets.immobilisations.net);
  const bfr = assets.stocks.total;
  const tn = round2(fr - bfr);
  return { fr, bfr, tn, isConsistent: Math.abs(tn - assets.treasury.total) < 0.01 };
}

// The standard ratios a feasibility study reports: solvabilité, liquidité
// (générale and réduite -- réduite leaves the stocks out), autonomie
// financière, marge d'EBE (EBITDA) and rentabilité (ROE/ROA). Anything
// dividing by zero (no debt, no revenue yet) reads null rather than
// Infinity/NaN -- the panel shows "—" for it.
export function financialRatios(hotelState, restaurantState = {}, day = 0) {
  const assets = assetsOf(hotelState, day);
  const liabilities = liabilitiesOf(hotelState, day);
  const income = incomeStatementOf(hotelState, restaurantState, day);
  const shortTermDebt = liabilities.overdraft;
  const ebitda = round2(income.resultatNet + income.charges.amortissements + income.charges.interets);

  return {
    solvabilite: ratioOrNull(assets.total, liabilities.loans + liabilities.overdraft),
    liquiditeGenerale: ratioOrNull(assets.stocks.total + assets.treasury.total, shortTermDebt),
    liquiditeReduite: ratioOrNull(assets.treasury.total, shortTermDebt),
    autonomieFinanciere: ratioOrNull(liabilities.equity, assets.total),
    margeEbitda: ratioOrNull(ebitda, income.produits.total),
    roe: ratioOrNull(income.resultatNet, liabilities.equity),
    roa: ratioOrNull(income.resultatNet, assets.total),
    ebitda,
  };
}

function bookableRooms(rooms) {
  return safeArray(rooms).filter((room) => room.type !== "seminar" && room.type !== "conference");
}

// Today's operational KPIs: RevPAR, ADR, taux d'occupation, TrevPAR, CPOR et
// GOPPAR -- one calendar day's snapshot (see occupancyOf() -- meeting rooms
// are never counted). `dailyRevenue`/`dailyCosts` are today's played figures
// (careerState.lastDayReport, when there is one); without one every KPI
// past occupancy itself reads null rather than a meaningless 0.
export function hotelKpis(rooms, { dailyRevenue, dailyCosts } = {}) {
  const beds = bookableRooms(rooms);
  const occupancy = occupancyOf(rooms);
  const totalRooms = beds.length;
  const prices = beds.filter((room) => room.status === "occupée").map((room) => safeNumber(room.price, 0));
  const adr = prices.length ? round2(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null;
  const revpar = totalRooms > 0 && adr !== null ? round2((adr * occupancy.occupied) / totalRooms) : totalRooms > 0 ? 0 : null;
  const trevpar = totalRooms > 0 && Number.isFinite(dailyRevenue) ? round2(dailyRevenue / totalRooms) : null;
  const cpor = occupancy.occupied > 0 && Number.isFinite(dailyCosts) ? round2(dailyCosts / occupancy.occupied) : null;
  const goppar = totalRooms > 0 && Number.isFinite(dailyRevenue) && Number.isFinite(dailyCosts) ? round2((dailyRevenue - dailyCosts) / totalRooms) : null;
  return { occupancyRate: occupancy.rate, occupiedRooms: occupancy.occupied, totalRooms, adr, revpar, trevpar, cpor, goppar };
}

export function describeFinancialAnalysis(hotelState, restaurantState = {}, rooms = [], { day = 0, dailyRevenue, dailyCosts } = {}) {
  return {
    masses: massesBilantaires(hotelState, day),
    ratios: financialRatios(hotelState, restaurantState, day),
    kpis: hotelKpis(rooms, { dailyRevenue, dailyCosts }),
  };
}

const FinancialRatiosEngine = { massesBilantaires, financialRatios, hotelKpis, describeFinancialAnalysis };
export default FinancialRatiosEngine;
