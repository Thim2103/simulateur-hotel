// The hotel's bank: loans to invest with (renovations, the loyalty club, a
// seminar room...), what they cost, and what an empty account costs.
//
// THREE LOANS, one of each at a time:
//   - crédit de trésorerie -- 5 000 to 10 000 EUR over 30 days, at a high rate
//   - prêt d'investissement -- 25 000 to 50 000 EUR over 90 days, at a moderate rate
//   - emprunt obligataire / expansion -- 100 000 EUR over 180 days, the lowest
//     rate, for 4 and 5-star hotels with a good credit score only
//
// HOW A LOAN WORKS. The money lands in the account at once (a 1 % origination fee
// is charged on top, an ordinary expense). Every day the hotel pays back an equal
// slice of the principal (the principal moves the account, it is not an expense)
// and the interest on what is still owed -- the day's interest goes with the
// daily expenses, so it shows in the finance pages. A loan can be repaid early
// for a 1 % fee.
//
// THE ACCOUNT. `balanceOf()` (lib/finance/investmentFunding.js) can go below zero.
// Every day it starts negative costs agios (0.4 % of the overdraft) and a flat
// 50 EUR fee. An instalment the account cannot cover is a missed payment: 5 %
// late fee, and a dent in the credit score.
//
// THE CREDIT SCORE (0-100) says how much the bank trusts the hotel: a base of
// 30, plus the reputation (up to 25), the cover of the debt by the hotel's own
// funds (up to 15), a positive account (10) and loans repaid (5 each, up to 15),
// minus 2 per day overdrawn and 10 per missed payment (30 at most each). It sets
// how much the hotel may owe in all -- 2 000 EUR per point.
//
// State: `hotelState.banking` = { loans, nextId, cashAdjustment, overdraftDays,
// missedPayments, repaidLoans, ledger, today, lastOutcome }. Pure and
// deterministic; a hotel that never borrowed keeps no such state.
import { safeArray, safeNumber, safeObject } from "../safe.js";
import { balanceOf, capitalOf, treasuryOf } from "../finance/investmentFunding";
import { debitCurrentMonth } from "../finance/oneOffCosts";
import { toIsoDate } from "../hotelEvents/hotelEventsEngine";
import { starRating } from "../expansion/majorProjectsEngine";

export const ORIGINATION_FEE_RATE = 0.01;
export const EARLY_REPAY_FEE_RATE = 0.01;
export const OVERDRAFT_DAILY_RATE = 0.004;
export const OVERDRAFT_DAILY_FEE = 50;
export const LATE_FEE_RATE = 0.05;
export const CEILING_PER_POINT = 2000;
export const MAX_ACTIVE_LOANS = 3;
// Game Balancing V1.0, Lot 3: growth loans (investment, bond) follow the real
// bank rule of a minimum equity contribution -- the hotel must already hold,
// in its own funds (treasury + capital), at least this share of what it asks
// to borrow. A crédit de trésorerie (an emergency cap, not a growth loan)
// stays exempt.
export const MIN_EQUITY_RATE = 0.3;

export const LOAN_TYPES = {
  cash: {
    id: "cash",
    icon: "💶",
    label: "Crédit de trésorerie",
    min: 5000,
    max: 10000,
    step: 1000,
    termDays: 30,
    dailyRate: 0.004,
    rateLabel: "élevé",
    description: "Un crédit court pour passer un cap : remboursé en 30 jours, à un taux élevé.",
  },
  investment: {
    id: "investment",
    icon: "🏗️",
    label: "Prêt d'investissement",
    min: 25000,
    max: 50000,
    step: 5000,
    termDays: 90,
    dailyRate: 0.0018,
    rateLabel: "modéré",
    minScore: 50,
    requiresEquity: true,
    description: "Pour financer rénovations, club de fidélité ou salle de séminaire : remboursé en 90 jours, à un taux modéré. Réservé aux hôtels au score de crédit correct, avec un apport personnel d'au moins 30 % du montant emprunté.",
  },
  bond: {
    id: "bond",
    icon: "🏛️",
    label: "Emprunt obligataire / Expansion",
    min: 100000,
    max: 100000,
    step: 100000,
    termDays: 180,
    dailyRate: 0.0011,
    rateLabel: "bas",
    minStars: 4,
    minScore: 70,
    requiresEquity: true,
    description: "Le grand financement d'une extension : 100 000 € sur 180 jours au taux le plus bas, réservé aux hôtels 4★/5★ avec un bon score de crédit et un apport personnel d'au moins 30 % du montant emprunté.",
  },
};
export const LOAN_TYPE_IDS = Object.keys(LOAN_TYPES);

// ---- state ------------------------------------------------------------------------------

const EMPTY_LEDGER = { interest: 0, fees: 0, principalPaid: 0 };

function state(hotelState) {
  const source = safeObject(safeObject(hotelState).banking);
  return {
    loans: safeArray(source.loans),
    nextId: Math.max(1, safeNumber(source.nextId, 1)),
    cashAdjustment: safeNumber(source.cashAdjustment, 0),
    overdraftDays: safeNumber(source.overdraftDays, 0),
    missedPayments: safeNumber(source.missedPayments, 0),
    repaidLoans: safeNumber(source.repaidLoans, 0),
    ledger: { ...EMPTY_LEDGER, ...safeObject(source.ledger) },
    today: source.today || null,
    lastOutcome: source.lastOutcome || null,
  };
}

function write(hotelState, patch) {
  return { ...safeObject(hotelState), banking: { ...safeObject(safeObject(hotelState).banking), ...patch } };
}

const isActive = (loan) => loan.status === "active";
export const activeLoans = (hotelState) => state(hotelState).loans.filter(isActive);
export const loanHistory = (hotelState) => state(hotelState).loans.filter((loan) => !isActive(loan));
export const lastOutcome = (hotelState) => state(hotelState).lastOutcome;
export const outstandingDebt = (hotelState) => activeLoans(hotelState).reduce((sum, loan) => sum + loan.balance, 0);
export const isOverdrawn = (hotelState) => balanceOf(hotelState) < 0;

// The hotel's stars, the ones its major projects have earned it included.
export function starsOf(hotelState) {
  return starRating(hotelState);
}

// The hotel's own funds: what proves it can carry a growth loan (Lot 3's
// 30 % equity rule), same figure the credit score's "cover" already reads.
export function ownFundsOf(hotelState) {
  return treasuryOf(hotelState) + capitalOf(hotelState);
}

// The most of `type` the equity rule alone would let the hotel borrow (its
// own funds divided by the required share); Infinity for a loan that carries
// no such requirement.
function equityCapFor(type, hotelState) {
  return type.requiresEquity ? Math.floor(ownFundsOf(hotelState) / MIN_EQUITY_RATE) : Infinity;
}

// ---- credit ------------------------------------------------------------------------------------

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// What the bank makes of the hotel, 0..100.
export function creditScore(hotelState) {
  const source = state(hotelState);
  const reputation = safeNumber(safeObject(safeObject(safeObject(hotelState).progression).player).reputation, 60);
  const debt = outstandingDebt(hotelState);
  const own = treasuryOf(hotelState) + capitalOf(hotelState);
  const cover = debt === 0 ? 15 : Math.min(15, (own / debt) * 5);
  const score =
    30 +
    clamp(reputation, 0, 100) * 0.25 +
    cover +
    (balanceOf(hotelState) >= 0 ? 10 : 0) +
    Math.min(15, source.repaidLoans * 5) -
    Math.min(30, source.overdraftDays * 2) -
    Math.min(30, source.missedPayments * 10);
  return Math.round(clamp(score, 0, 100));
}

export function creditRating(score) {
  if (score >= 75) return { id: "excellent", label: "Excellent", tone: "success" };
  if (score >= 60) return { id: "good", label: "Bon", tone: "action" };
  if (score >= 45) return { id: "fair", label: "Moyen", tone: "vip" };
  return { id: "weak", label: "Fragile", tone: "danger" };
}

// How much the hotel may owe in all, and how much of it is still free.
export function borrowingCeiling(hotelState) {
  return creditScore(hotelState) * CEILING_PER_POINT;
}
export function borrowingCapacity(hotelState) {
  return Math.max(0, borrowingCeiling(hotelState) - outstandingDebt(hotelState));
}

// The hotel's own funds against what it owes (null when it owes nothing).
export function solvencyRatio(hotelState) {
  const debt = outstandingDebt(hotelState);
  if (debt <= 0) return null;
  return Math.round(((treasuryOf(hotelState) + capitalOf(hotelState)) / debt) * 100) / 100;
}

// ---- the loans ------------------------------------------------------------------------------------

// What a loan of `amount` would cost, in full.
export function quote(typeId, amount) {
  const type = LOAN_TYPES[typeId];
  if (!type) return null;
  const principal = Math.round(safeNumber(amount, type.min));
  const principalPerDay = principal / type.termDays;
  const firstInterest = principal * type.dailyRate;
  return {
    principal,
    termDays: type.termDays,
    dailyRate: type.dailyRate,
    principalPerDay: Math.round(principalPerDay * 100) / 100,
    firstDayInterest: Math.round(firstInterest * 100) / 100,
    firstDayPayment: Math.round((principalPerDay + firstInterest) * 100) / 100,
    // Interest on a balance that falls by an equal slice each day.
    totalInterest: Math.round(principal * type.dailyRate * ((type.termDays + 1) / 2)),
    originationFee: Math.round(principal * ORIGINATION_FEE_RATE),
  };
}

export function isValidAmount(typeId, amount) {
  const type = LOAN_TYPES[typeId];
  const value = safeNumber(amount, NaN);
  return !!type && Number.isFinite(value) && value >= type.min && value <= type.max && (value - type.min) % type.step === 0;
}

// Whether the bank would lend, and why not: [{ type, available, reason }].
export function loanOptions(hotelState) {
  const loans = activeLoans(hotelState);
  const score = creditScore(hotelState);
  const capacity = borrowingCapacity(hotelState);
  return LOAN_TYPE_IDS.map((id) => {
    const type = LOAN_TYPES[id];
    let reason = "";
    const equityCap = equityCapFor(type, hotelState);
    if (loans.some((loan) => loan.type === id)) reason = "Un crédit de ce type est déjà en cours";
    else if (loans.length >= MAX_ACTIVE_LOANS) reason = "Trop de crédits en cours";
    else if (type.minStars && starsOf(hotelState) < type.minStars) reason = `Réservé aux hôtels ${type.minStars}★ et plus`;
    else if (type.minScore && score < type.minScore) reason = `Score de crédit insuffisant (${type.minScore} requis, vous avez ${score})`;
    else if (type.requiresEquity && equityCap < type.min) reason = `Apport personnel insuffisant (${Math.round(MIN_EQUITY_RATE * 100)} % du montant emprunté requis, soit au moins ${Math.round(type.min * MIN_EQUITY_RATE).toLocaleString("fr-FR")} € de fonds propres)`;
    else if (capacity < type.min) reason = "Capacité d'emprunt insuffisante";
    return { type: id, available: reason === "", reason, maxAmount: Math.min(type.max, Math.floor(capacity / type.step) * type.step, Math.floor(equityCap / type.step) * type.step) };
  });
}

// Takes a loan. A no-op unless the bank would lend that amount of that kind.
export function takeLoan(hotelBundle, typeId, amount, { day = 0, date } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const type = LOAN_TYPES[typeId];
  const option = loanOptions(hotelState).find((item) => item.type === typeId);
  if (!type || !option?.available || !isValidAmount(typeId, amount) || amount > borrowingCapacity(hotelState)) return bundle;
  if (type.requiresEquity && ownFundsOf(hotelState) < amount * MIN_EQUITY_RATE) return bundle;

  const source = state(hotelState);
  const priced = quote(typeId, amount);
  const loan = {
    id: `loan:${source.nextId}`,
    type: typeId,
    principal: priced.principal,
    balance: priced.principal,
    dailyRate: type.dailyRate,
    termDays: type.termDays,
    principalPerDay: priced.principal / type.termDays,
    startDay: day,
    startDate: date ? toIsoDate(date) : null,
    status: "active",
    paidInterest: 0,
    missed: 0,
  };
  const debited = debitCurrentMonth(hotelState, priced.originationFee);
  return {
    ...bundle,
    hotelState: write(debited, {
      loans: [...source.loans, loan].slice(-12),
      nextId: source.nextId + 1,
      cashAdjustment: source.cashAdjustment + priced.principal,
      ledger: { ...source.ledger, fees: source.ledger.fees + priced.originationFee },
      lastOutcome: { type: "borrow", day, text: `${type.label} de ${priced.principal.toLocaleString("fr-FR")} € accordé : ${priced.principal.toLocaleString("fr-FR")} € versés sur le compte, remboursement sur ${type.termDays} jours.` },
    }),
  };
}

// What repaying a loan now would cost (what is still owed, plus the fee).
export function earlyRepayment(loan) {
  const fee = Math.round(loan.balance * EARLY_REPAY_FEE_RATE);
  return { balance: Math.round(loan.balance), fee, total: Math.round(loan.balance) + fee };
}

// Repays a loan in full. A no-op unless it is running and the account can pay.
export function repayLoan(hotelBundle, loanId, { day = 0 } = {}) {
  const bundle = safeObject(hotelBundle);
  const hotelState = safeObject(bundle.hotelState);
  const source = state(hotelState);
  const loan = source.loans.find((item) => item.id === loanId && isActive(item));
  if (!loan) return bundle;
  const cost = earlyRepayment(loan);
  if (treasuryOf(hotelState) < cost.total) return bundle;

  const debited = cost.fee > 0 ? debitCurrentMonth(hotelState, cost.fee) : hotelState;
  return {
    ...bundle,
    hotelState: write(debited, {
      loans: source.loans.map((item) => (item.id === loanId ? { ...item, balance: 0, status: "repaid", repaidDay: day, early: true } : item)),
      cashAdjustment: source.cashAdjustment - cost.balance,
      repaidLoans: source.repaidLoans + 1,
      ledger: { ...source.ledger, fees: source.ledger.fees + cost.fee, principalPaid: source.ledger.principalPaid + cost.balance },
      lastOutcome: { type: "repay", day, text: `${LOAN_TYPES[loan.type].label} remboursé par anticipation (${cost.total.toLocaleString("fr-FR")} € frais compris).` },
    }),
  };
}

// ---- the daily costs ------------------------------------------------------------------------------------

// The day's interest on what is still owed.
export function loanInterestOn(hotelState) {
  return activeLoans(hotelState).reduce((sum, loan) => sum + loan.balance * loan.dailyRate, 0);
}

// The agios and fee of a day that starts with the account overdrawn.
export function overdraftCostOn(hotelState) {
  const balance = balanceOf(hotelState);
  return balance < 0 ? -balance * OVERDRAFT_DAILY_RATE + OVERDRAFT_DAILY_FEE : 0;
}

// Everything the bank takes with the day's expenses (see calculateExpenses).
export function bankingCostOn(hotelState) {
  return loanInterestOn(hotelState) + overdraftCostOn(hotelState);
}

// ---- the daily step ---------------------------------------------------------------------------------------

// Called once a day, after the day is played (see careerEngine.runCareerDay):
// the day's slice of every loan is paid back (a payment the account cannot cover
// is a missed one), finished loans are closed, and the days spent overdrawn are
// counted.
export function advanceBanking(hotelState, { date, day = 0 } = {}) {
  const source = state(hotelState);
  const iso = toIsoDate(date ?? new Date());
  const running = source.loans.filter(isActive);
  if (running.length === 0 && balanceOf(hotelState) >= 0) return hotelState;

  const interest = running.reduce((sum, loan) => sum + loan.balance * loan.dailyRate, 0);
  const due = running.map((loan) => ({ loan, slice: Math.min(loan.balance, loan.principalPerDay) }));
  const totalDue = due.reduce((sum, item) => sum + item.slice, 0);
  const missed = totalDue > 0 && balanceOf(hotelState) < totalDue;
  const lateFee = missed ? Math.round(totalDue * LATE_FEE_RATE) : 0;

  const repaidNow = [];
  const loans = source.loans.map((loan) => {
    const item = due.find((entry) => entry.loan.id === loan.id);
    if (!item) return loan;
    const balance = loan.balance - item.slice;
    const next = { ...loan, balance, paidInterest: loan.paidInterest + loan.balance * loan.dailyRate, missed: loan.missed + (missed ? 1 : 0) };
    if (balance <= 0.5) {
      repaidNow.push(loan.type);
      return { ...next, balance: 0, status: "repaid", repaidDay: day, early: false };
    }
    return next;
  });

  let next = lateFee > 0 ? debitCurrentMonth(hotelState, lateFee) : hotelState;
  const cashAdjustment = source.cashAdjustment - totalDue;
  const after = { ...next, banking: { ...safeObject(next.banking), cashAdjustment } };
  const overdrawn = balanceOf(after) < 0;

  return write(after, {
    loans,
    cashAdjustment,
    overdraftDays: source.overdraftDays + (overdrawn ? 1 : 0),
    missedPayments: source.missedPayments + (missed ? 1 : 0),
    repaidLoans: source.repaidLoans + repaidNow.length,
    ledger: { interest: source.ledger.interest + interest, fees: source.ledger.fees + lateFee, principalPaid: source.ledger.principalPaid + totalDue },
    today: { date: iso, day, interest: Math.round(interest), principal: Math.round(totalDue), missed, lateFee, repaid: repaidNow, overdrawn },
  });
}

// The bank in the day just played, as lines of the daily review.
export function bankingNewsOn(hotelState, date) {
  const today = state(hotelState).today;
  if (!today || today.date !== toIsoDate(date)) return [];
  const lines = [];
  if (today.principal > 0 || today.interest > 0) {
    lines.push(`Prêts bancaires : ${today.principal.toLocaleString("fr-FR")} € de capital remboursé et ${today.interest.toLocaleString("fr-FR")} € d'intérêts.`);
  }
  today.repaid.forEach((type) => lines.push(`${LOAN_TYPES[type].label} entièrement remboursé : la banque vous fait davantage confiance.`));
  if (today.missed) lines.push(`Échéance non couverte : pénalité de retard de ${today.lateFee.toLocaleString("fr-FR")} € et score de crédit en baisse.`);
  if (today.overdrawn) lines.push("Le compte est à découvert : agios et frais chaque jour tant qu'il n'est pas renfloué.");
  return lines;
}

// ---- how the interface reads it ----------------------------------------------------------------------------

// The bank at a glance.
export function describeBanking(hotelState) {
  const source = state(hotelState);
  const score = creditScore(hotelState);
  const debt = outstandingDebt(hotelState);
  const loans = source.loans.filter(isActive).map((loan) => {
    const daysLeft = Math.max(0, Math.ceil(loan.balance / loan.principalPerDay));
    return {
      ...loan,
      label: LOAN_TYPES[loan.type].label,
      icon: LOAN_TYPES[loan.type].icon,
      daysLeft,
      dailyPayment: Math.round((loan.principalPerDay + loan.balance * loan.dailyRate) * 100) / 100,
      progressPercent: Math.round(((loan.principal - loan.balance) / loan.principal) * 100),
      repay: earlyRepayment(loan),
    };
  });
  return {
    score,
    rating: creditRating(score),
    stars: starsOf(hotelState),
    balance: Math.round(balanceOf(hotelState)),
    treasury: Math.round(treasuryOf(hotelState)),
    overdrawn: isOverdrawn(hotelState),
    debt: Math.round(debt),
    ceiling: borrowingCeiling(hotelState),
    capacity: Math.round(borrowingCapacity(hotelState)),
    solvency: solvencyRatio(hotelState),
    dailyDue: Math.round(loans.reduce((sum, loan) => sum + loan.dailyPayment, 0)),
    overdraftDays: source.overdraftDays,
    missedPayments: source.missedPayments,
    repaidLoans: source.repaidLoans,
    loans,
    options: loanOptions(hotelState),
    ledger: { interest: Math.round(source.ledger.interest), fees: Math.round(source.ledger.fees), principalPaid: Math.round(source.ledger.principalPaid) },
    lastOutcome: source.lastOutcome,
  };
}

const BankingLoanEngine = { takeLoan, repayLoan, advanceBanking, bankingCostOn, creditScore, describeBanking, loanOptions, quote, bankingNewsOn };
export default BankingLoanEngine;
