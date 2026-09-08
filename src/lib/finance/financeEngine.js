// Orchestrates the Finance module: given the player's own hotel bundle
// ({ hotelState, restaurantState, rooms, reservations } -- the same shape
// runDailyCycle()/careerEngine.startCareer()/lib/guest/guestAdapter.js's
// createGuestHotelBundle() all share), computes one full finance cycle
// (income statement -> balance sheet -> cash-flow -> ratios ->
// diagnostics -> forecast), records it into the finance replay log, and
// exposes a small catalog of financial actions a player can apply to
// their own hotel bundle -- the same "pure (hotelBundle) => nextBundle"
// contract lib/dashboard/dashboardActions.js's applyQuickAction() uses,
// so useFinance.js can drive it through useCareer.js's
// applyHotelAdjustment() exactly the way Dashboard.jsx's Quick Actions
// already do.
import { safeArray, safeNumber, safeObject } from "../safe";
import { computeBalanceSheet, computeCashFlow, computeIncomeStatement, computeRatios } from "./financeCalculations";
import { generateFinancialDiagnostics } from "./financeDiagnostics";
import { generateFinancialForecast } from "./financeForecast";
import { createFinanceState } from "./financeState";
import { recordCycle } from "../scenario/scenarioReplay";

function toDateOnly(referenceDate) {
  return String(referenceDate?.toISOString ? referenceDate.toISOString() : referenceDate).slice(0, 10);
}

// 1-7. Runs one finance cycle against the player's hotel bundle: pulls
// hotelState.finance/restaurantState.finance (the same monthly figures
// useHotelSimulator.js/useRestaurantSimulator.js already compute kpis
// from -- this module doesn't re-simulate revenue/expenses), and builds
// everything a FinanceState needs on top of them.
export function runFinanceCycle({ hotelBundle, previousState = null, referenceDate = new Date() } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const restaurantState = safeObject(bundle.restaurantState);
  const roomCount = safeArray(bundle.rooms).length;
  const previous = safeObject(previousState);
  const cyclesElapsed = safeNumber(previous.cyclesElapsed, 0) + 1;

  const incomeStatement = computeIncomeStatement({ hotelFinance: hotelState.finance, restaurantFinance: restaurantState.finance, roomCount });
  const balanceSheet = computeBalanceSheet({ incomeStatement, roomCount, cyclesElapsed, previousCash: previous.cash });
  const cashFlow = computeCashFlow({ incomeStatement, balanceSheet, previousCash: previous.cash });
  const ratios = computeRatios({ incomeStatement, balanceSheet, roomCount });
  const diagnostics = generateFinancialDiagnostics({ incomeStatement, balanceSheet, ratios });

  const nextState = createFinanceState({
    period: toDateOnly(referenceDate),
    incomeStatement,
    balanceSheet,
    cashFlow,
    ratios,
    diagnostics,
    cash: cashFlow.closingCash,
    cyclesElapsed,
    replayLog: recordCycle(previous.replayLog, {
      cycleIndex: cyclesElapsed - 1,
      period: toDateOnly(referenceDate),
      incomeStatement,
      balanceSheet,
      cashFlow,
      ratios,
      diagnostics,
    }),
    lastUpdated: new Date().toISOString(),
  });

  const forecast = generateFinancialForecast(nextState);
  return { ...nextState, forecast };
}

// Quick actions -- "ajuster budget marketing / staffing / prix / investir
// / réduire coûts" (see the Refonte Finance request's section 4). Each
// is a pure (hotelBundle) => nextHotelBundle transform, same contract as
// lib/dashboard/dashboardActions.js's applyQuickAction().
export const FINANCE_ACTION_CATALOG = [
  { id: "increase-marketing-budget", category: "marketing", label: "Augmenter le budget marketing", description: "Ajoute 500 € au budget marketing mensuel." },
  { id: "reduce-marketing-budget", category: "marketing", label: "Réduire le budget marketing", description: "Retire 500 € du budget marketing mensuel." },
  { id: "adjust-staffing", category: "staffing", label: "Ajuster le staffing", description: "Augmente la masse salariale de 5% (renforce les équipes)." },
  { id: "reduce-staffing", category: "staffing", label: "Réduire le staffing", description: "Réduit la masse salariale de 5% (économie de coûts)." },
  { id: "adjust-prices", category: "pricing", label: "Ajuster les prix (+5%)", description: "Augmente le prix de toutes les réservations actives." },
  { id: "invest", category: "investment", label: "Investir dans l'établissement", description: "Investit 2 000 € (capex) pour améliorer l'établissement." },
  { id: "reduce-costs", category: "costs", label: "Réduire les coûts fixes", description: "Réduit les coûts fixes mensuels de 5%." },
];

export function findFinanceAction(actionId) {
  return FINANCE_ACTION_CATALOG.find((action) => action.id === actionId) || null;
}

function scaleFinance(finance, key, factor) {
  return { ...finance, [key]: Math.max(0, Math.round(safeNumber(finance?.[key], 0) * factor)) };
}

export function applyFinancialDecision(hotelBundle, actionId, payload = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);

  switch (actionId) {
    case "increase-marketing-budget":
      return { ...bundle, hotelState: { ...hotelState, marketing: { ...safeObject(hotelState.marketing), budget: safeNumber(hotelState.marketing?.budget, 0) + safeNumber(payload.amount, 500) } } };
    case "reduce-marketing-budget":
      return { ...bundle, hotelState: { ...hotelState, marketing: { ...safeObject(hotelState.marketing), budget: Math.max(0, safeNumber(hotelState.marketing?.budget, 0) - safeNumber(payload.amount, 500)) } } };
    case "adjust-staffing":
      return { ...bundle, hotelState: { ...hotelState, finance: scaleFinance(hotelState.finance, "payroll", 1.05) } };
    case "reduce-staffing":
      return { ...bundle, hotelState: { ...hotelState, finance: scaleFinance(hotelState.finance, "payroll", 0.95) } };
    case "adjust-prices": {
      const percent = safeNumber(payload.percent, 5);
      const reservations = safeArray(bundle.reservations).map((reservation) => ({ ...reservation, price: Math.max(0, Math.round(safeNumber(reservation.price, 0) * (1 + percent / 100))) }));
      return { ...bundle, reservations };
    }
    case "invest":
      return { ...bundle, hotelState: { ...hotelState, finance: { ...safeObject(hotelState.finance), fixedCosts: safeNumber(hotelState.finance?.fixedCosts, 0) + safeNumber(payload.amount, 2000) } } };
    case "reduce-costs":
      return { ...bundle, hotelState: { ...hotelState, finance: scaleFinance(hotelState.finance, "fixedCosts", 0.95) } };
    default:
      return bundle;
  }
}

// Career integration -- "synchroniser avec careerEngine" (see the
// Refonte Finance request's sections 1 and 5): builds a finance cycle
// straight from a CareerState (see lib/career/careerState.js), so
// Career mode's own hotel bundle feeds the same Finance module a
// standalone (Guest Mode) session uses, without careerEngine.js needing
// to know anything about this module.
export function financeFromCareerState(careerState, previousFinanceState = null) {
  const state = safeObject(careerState);
  return runFinanceCycle({ hotelBundle: state.hotel, previousState: previousFinanceState });
}

export const financeEngine = {
  runFinanceCycle,
  applyFinancialDecision,
  financeFromCareerState,
  FINANCE_ACTION_CATALOG,
  findFinanceAction,
};
export default financeEngine;
