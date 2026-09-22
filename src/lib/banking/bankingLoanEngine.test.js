import {
  ORIGINATION_FEE_RATE,
  EARLY_REPAY_FEE_RATE,
  OVERDRAFT_DAILY_RATE,
  OVERDRAFT_DAILY_FEE,
  LATE_FEE_RATE,
  CEILING_PER_POINT,
  LOAN_TYPES,
  LOAN_TYPE_IDS,
  activeLoans,
  loanHistory,
  outstandingDebt,
  isOverdrawn,
  starsOf,
  creditScore,
  creditRating,
  borrowingCeiling,
  borrowingCapacity,
  solvencyRatio,
  quote,
  isValidAmount,
  loanOptions,
  takeLoan,
  earlyRepayment,
  repayLoan,
  loanInterestOn,
  overdraftCostOn,
  bankingCostOn,
  advanceBanking,
  bankingNewsOn,
  describeBanking,
  lastOutcome,
} from "./bankingLoanEngine";
import { balanceOf, treasuryOf } from "../finance/investmentFunding";

const DAY = 86400000;
const START = "2026-09-14";
const at = (n) => new Date(Date.parse(`${START}T12:00:00Z`) + n * DAY);
const hotel = (extra = {}) => ({ finance: { revenue: [100000], costs: [20000] }, structure: { starRating: 4 }, progression: { player: { reputation: 70 } }, ...extra });
const bundle = (extra) => ({ hotelState: hotel(extra), rooms: [1], reservations: [2] });
const borrow = (typeId, amount, extra, day = 1) => takeLoan(bundle(extra), typeId, amount, { day, date: at(0) }).hotelState;
const loanOf = (state) => activeLoans(state)[0];
// Plays `days` end-of-day steps, the account earning nothing more.
function play(state, days, from = 0) {
  let current = state;
  for (let i = 0; i < days; i += 1) current = advanceBanking(current, { date: at(from + i), day: from + i });
  return current;
}

describe("bankingLoanEngine / the account", () => {
  it("is what was earned net of what was spent, plus the money lent", () => {
    expect(balanceOf(hotel())).toBe(80000);
    expect(balanceOf(hotel({ banking: { cashAdjustment: 5000 } }))).toBe(85000);
    expect(balanceOf(hotel({ banking: { cashAdjustment: -5000 } }))).toBe(75000);
  });

  it("the treasury never goes below zero, the account does", () => {
    const red = hotel({ finance: { revenue: [1000], costs: [4000] } });
    expect(balanceOf(red)).toBe(-3000);
    expect(treasuryOf(red)).toBe(0);
    expect(isOverdrawn(red)).toBe(true);
    expect(isOverdrawn(hotel())).toBe(false);
  });

  it("is unchanged for a hotel that never borrowed", () => {
    expect(treasuryOf({ finance: { revenue: [10, 20], costs: [5] } })).toBe(25);
    expect(treasuryOf(undefined)).toBe(0);
  });
});

describe("bankingLoanEngine / inert without a loan", () => {
  it("does nothing, and keeps no state, for a hotel with no loan and a positive account", () => {
    const state = hotel();
    expect(advanceBanking(state, { date: at(0), day: 1 })).toBe(state);
    expect(activeLoans(state)).toEqual([]);
    expect(loanHistory(state)).toEqual([]);
    expect(outstandingDebt(state)).toBe(0);
    expect(loanInterestOn(state)).toBe(0);
    expect(overdraftCostOn(state)).toBe(0);
    expect(bankingCostOn(state)).toBe(0);
    expect(bankingNewsOn(state, at(0))).toEqual([]);
    expect(solvencyRatio(state)).toBeNull();
    expect(lastOutcome(state)).toBeNull();
  });
});

describe("bankingLoanEngine / the three loans", () => {
  it("a short credit: 5 000 to 10 000 EUR over 30 days at the highest rate", () => {
    expect(LOAN_TYPES.cash).toMatchObject({ min: 5000, max: 10000, termDays: 30 });
  });

  it("an investment loan: 25 000 to 50 000 EUR over 90 days at a moderate rate", () => {
    expect(LOAN_TYPES.investment).toMatchObject({ min: 25000, max: 50000, termDays: 90 });
  });

  it("a bond: 100 000 EUR, for 4-star hotels with a good score", () => {
    expect(LOAN_TYPES.bond).toMatchObject({ min: 100000, max: 100000, minStars: 4, minScore: 70 });
  });

  it("the longer the loan, the cheaper the rate", () => {
    expect(LOAN_TYPES.cash.dailyRate).toBeGreaterThan(LOAN_TYPES.investment.dailyRate);
    expect(LOAN_TYPES.investment.dailyRate).toBeGreaterThan(LOAN_TYPES.bond.dailyRate);
  });

  it("amounts follow the steps of each", () => {
    expect(isValidAmount("cash", 5000)).toBe(true);
    expect(isValidAmount("cash", 7000)).toBe(true);
    expect(isValidAmount("cash", 7500)).toBe(false);
    expect(isValidAmount("cash", 4000)).toBe(false);
    expect(isValidAmount("cash", 11000)).toBe(false);
    expect(isValidAmount("investment", 30000)).toBe(true);
    expect(isValidAmount("investment", 26000)).toBe(false);
    expect(isValidAmount("bond", 100000)).toBe(true);
    expect(isValidAmount("bond", 50000)).toBe(false);
    expect(isValidAmount("cash", "abc")).toBe(false);
    expect(isValidAmount("nope", 5000)).toBe(false);
  });

  it("quotes what a loan costs", () => {
    expect(quote("cash", 10000)).toEqual({
      principal: 10000,
      termDays: 30,
      dailyRate: 0.004,
      principalPerDay: 333.33,
      firstDayInterest: 40,
      firstDayPayment: 373.33,
      totalInterest: 620,
      originationFee: 100,
    });
    expect(quote("investment", 50000).totalInterest).toBe(Math.round(50000 * 0.0018 * 45.5));
    expect(quote("nope", 5000)).toBeNull();
  });

  it("the total interest is the sum of the daily interest as the balance falls", () => {
    const priced = quote("cash", 9000);
    let balance = 9000;
    let total = 0;
    for (let day = 0; day < 30; day += 1) {
      total += balance * 0.004;
      balance -= 9000 / 30;
    }
    expect(priced.totalInterest).toBe(Math.round(total));
  });
});

describe("bankingLoanEngine / the credit score", () => {
  it("is 70 for a hotel of reputation 60 with a positive account and no debt", () => {
    expect(creditScore(hotel({ progression: { player: { reputation: 60 } } }))).toBe(70);
  });

  it("follows the reputation, 25 points at most", () => {
    expect(creditScore(hotel({ progression: { player: { reputation: 0 } } }))).toBe(55);
    expect(creditScore(hotel({ progression: { player: { reputation: 100 } } }))).toBe(80);
    expect(creditScore(hotel({ progression: { player: { reputation: 500 } } }))).toBe(80);
  });

  it("assumes a reputation of 60 when there is none", () => {
    expect(creditScore(hotel({ progression: undefined }))).toBe(70);
  });

  it("an overdrawn account loses its 10 points", () => {
    const red = hotel({ progression: { player: { reputation: 60 } }, finance: { revenue: [0], costs: [5000] } });
    expect(creditScore(red)).toBe(60);
  });

  it("a debt not covered by the hotel's own funds costs points", () => {
    const covered = { ...borrow("cash", 10000, { progression: { player: { reputation: 60 } } }) };
    expect(creditScore(covered)).toBe(70); // 90 000 of funds against 10 000 owed: fully covered
    const thin = borrow("cash", 10000, { progression: { player: { reputation: 60 } }, finance: { revenue: [30000], costs: [22000] } });
    expect(treasuryOf(thin)).toBeLessThan(outstandingDebt(thin) * 3);
    expect(creditScore(thin)).toBeLessThan(70);
  });

  it("loans repaid earn 5 points each, up to 15", () => {
    const base = { progression: { player: { reputation: 60 } } };
    expect(creditScore(hotel({ ...base, banking: { repaidLoans: 1 } }))).toBe(75);
    expect(creditScore(hotel({ ...base, banking: { repaidLoans: 3 } }))).toBe(85);
    expect(creditScore(hotel({ ...base, banking: { repaidLoans: 9 } }))).toBe(85);
  });

  it("days overdrawn and missed payments cost points, 30 at most each", () => {
    const base = { progression: { player: { reputation: 60 } } };
    expect(creditScore(hotel({ ...base, banking: { overdraftDays: 3 } }))).toBe(64);
    expect(creditScore(hotel({ ...base, banking: { overdraftDays: 90 } }))).toBe(40);
    expect(creditScore(hotel({ ...base, banking: { missedPayments: 2 } }))).toBe(50);
    expect(creditScore(hotel({ ...base, banking: { missedPayments: 9 } }))).toBe(40);
  });

  it("stays between 0 and 100", () => {
    const worst = hotel({ progression: { player: { reputation: 0 } }, finance: { revenue: [0], costs: [1] }, banking: { overdraftDays: 99, missedPayments: 99 } });
    expect(creditScore(worst)).toBe(0);
    expect(creditScore(hotel({ progression: { player: { reputation: 100 } }, banking: { repaidLoans: 9 } }))).toBeLessThanOrEqual(100);
  });

  it("is rated from Fragile to Excellent", () => {
    expect(creditRating(80)).toMatchObject({ id: "excellent", label: "Excellent", tone: "success" });
    expect(creditRating(75).id).toBe("excellent");
    expect(creditRating(65)).toMatchObject({ id: "good", label: "Bon" });
    expect(creditRating(60).id).toBe("good");
    expect(creditRating(50)).toMatchObject({ id: "fair", label: "Moyen" });
    expect(creditRating(45).id).toBe("fair");
    expect(creditRating(44)).toMatchObject({ id: "weak", label: "Fragile", tone: "danger" });
  });
});

describe("bankingLoanEngine / how much the hotel may owe", () => {
  it("is 2 000 EUR per point of credit score", () => {
    const state = hotel({ progression: { player: { reputation: 60 } } });
    expect(borrowingCeiling(state)).toBe(70 * CEILING_PER_POINT);
    expect(borrowingCapacity(state)).toBe(140000);
  });

  it("what is owed comes off what is left to borrow", () => {
    const state = borrow("investment", 50000);
    expect(borrowingCapacity(state)).toBe(borrowingCeiling(state) - 50000);
  });

  it("is never negative", () => {
    const state = { ...hotel({ progression: { player: { reputation: 0 } } }), banking: { loans: [{ id: "x", type: "bond", status: "active", balance: 900000, principalPerDay: 1, dailyRate: 0, principal: 900000 }] } };
    expect(borrowingCapacity(state)).toBe(0);
  });

  it("the solvency ratio sets the hotel's own funds against its debt", () => {
    const state = borrow("cash", 10000);
    expect(solvencyRatio(state)).toBe(Math.round(((treasuryOf(state) + 0) / 10000) * 100) / 100);
    const withCapital = borrow("cash", 10000, { expansion: { availableCapital: 20000 } });
    expect(solvencyRatio(withCapital)).toBeGreaterThan(solvencyRatio(state));
  });
});

describe("bankingLoanEngine / the bank's answer", () => {
  const option = (state, id) => loanOptions(state).find((item) => item.type === id);

  it("lends the short and the medium loans to a healthy hotel, and the bond to a 4-star one with a good score", () => {
    LOAN_TYPE_IDS.forEach((id) => expect(option(hotel(), id)).toMatchObject({ available: true, reason: "" }));
  });

  it("refuses the bond to a 3-star hotel", () => {
    expect(option(hotel({ structure: { starRating: 3 } }), "bond")).toMatchObject({ available: false, reason: "Réservé aux hôtels 4★ et plus" });
    expect(option(hotel({ structure: { starRating: 3 } }), "cash").available).toBe(true);
  });

  it("and to a hotel whose score is below 70", () => {
    const shaky = hotel({ progression: { player: { reputation: 40 } } });
    expect(option(shaky, "bond").reason).toBe(`Score de crédit insuffisant (70 requis, vous avez ${creditScore(shaky)})`);
  });

  it("a 5-star hotel qualifies like a 4-star one; a hotel with no rating counts as 3 stars", () => {
    expect(option(hotel({ structure: { starRating: 5 } }), "bond").available).toBe(true);
    expect(starsOf({})).toBe(3);
    expect(option(hotel({ structure: undefined }), "bond").available).toBe(false);
  });

  it("only one loan of each kind at a time", () => {
    const state = borrow("cash", 5000);
    expect(option(state, "cash")).toMatchObject({ available: false, reason: "Un crédit de ce type est déjà en cours" });
    expect(option(state, "investment").available).toBe(true);
  });

  it("refuses what the hotel may not owe any more", () => {
    const tight = hotel({ progression: { player: { reputation: 0 } }, finance: { revenue: [0], costs: [0] } });
    // score 55 -> ceiling 110 000, capacity 110 000 -> the bond is out by the score, the others are in
    expect(option(tight, "bond").available).toBe(false);
    const nearly = { ...borrow("investment", 50000, { progression: { player: { reputation: 0 } } }), };
    const small = { ...nearly, banking: { ...nearly.banking, loans: nearly.banking.loans.map((loan) => ({ ...loan, balance: 109000 })) } };
    expect(option(small, "cash")).toMatchObject({ available: false, reason: "Capacité d'emprunt insuffisante" });
  });

  it("says the most it would lend of each", () => {
    expect(option(hotel({ progression: { player: { reputation: 60 } } }), "cash").maxAmount).toBe(10000);
    expect(option(hotel({ progression: { player: { reputation: 60 } } }), "bond").maxAmount).toBe(100000);
  });

  it("too many loans at once", () => {
    const state = { ...hotel(), banking: { loans: ["a", "b", "c"].map((id) => ({ id, type: id, status: "active", balance: 1, principalPerDay: 1, dailyRate: 0, principal: 1 })) } };
    expect(option(state, "cash").reason).toBe("Trop de crédits en cours");
  });
});

describe("bankingLoanEngine / taking a loan", () => {
  it("pays the money into the account at once, less nothing: the fee is an expense", () => {
    const before = hotel();
    const next = borrow("cash", 10000);
    expect(treasuryOf(next) - treasuryOf(before)).toBe(10000 - 100);
    expect(balanceOf(next)).toBe(balanceOf(before) + 10000 - 100);
    expect(next.banking.cashAdjustment).toBe(10000);
    expect(next.finance.costs).toEqual([20000 + 100]);
  });

  it("the money lent is neither income nor expense in the books", () => {
    const next = borrow("investment", 30000);
    expect(next.finance.revenue).toEqual([100000]);
    expect(next.finance.costs).toEqual([20000 + Math.round(30000 * ORIGINATION_FEE_RATE)]);
  });

  it("records the loan", () => {
    const loan = loanOf(borrow("investment", 30000, undefined, 4));
    expect(loan).toMatchObject({ id: "loan:1", type: "investment", principal: 30000, balance: 30000, dailyRate: LOAN_TYPES.investment.dailyRate, termDays: 90, startDay: 4, startDate: START, status: "active" });
    expect(loan.principalPerDay).toBeCloseTo(30000 / 90, 8);
  });

  it("says so, and numbers the next loan", () => {
    const state = borrow("cash", 5000);
    expect(lastOutcome(state)).toMatchObject({ type: "borrow", text: expect.stringContaining("Crédit de trésorerie de 5") });
    expect(state.banking.nextId).toBe(2);
  });

  it("leaves the rest of the bundle alone", () => {
    const next = takeLoan(bundle(), "cash", 5000, { day: 1 });
    expect(next.rooms).toEqual([1]);
    expect(next.reservations).toEqual([2]);
  });

  it("does nothing for an amount the loan does not allow, or an unknown loan", () => {
    const start = bundle();
    expect(takeLoan(start, "cash", 7500)).toBe(start);
    expect(takeLoan(start, "cash", 20000)).toBe(start);
    expect(takeLoan(start, "nope", 5000)).toBe(start);
  });

  it("does nothing when the bank would refuse", () => {
    const three = bundle({ structure: { starRating: 3 } });
    expect(takeLoan(three, "bond", 100000)).toBe(three);
    const once = { hotelState: borrow("cash", 5000) };
    expect(takeLoan(once, "cash", 5000)).toBe(once);
  });

  it("does nothing beyond what the hotel may owe", () => {
    const state = { ...hotel({ progression: { player: { reputation: 0 } } }), banking: { loans: [{ id: "x", type: "bond", status: "active", balance: 105000, principalPerDay: 1, dailyRate: 0, principal: 105000 }] } };
    const start = { hotelState: state };
    expect(takeLoan(start, "cash", 10000)).toBe(start);
  });

  it("a hotel may hold a short credit and an investment loan together", () => {
    const state = takeLoan({ hotelState: borrow("cash", 5000) }, "investment", 25000, { day: 1 }).hotelState;
    expect(activeLoans(state).map((loan) => loan.type)).toEqual(["cash", "investment"]);
    expect(outstandingDebt(state)).toBe(30000);
  });
});

describe("bankingLoanEngine / the daily cost of a loan", () => {
  it("is the interest on what is still owed", () => {
    expect(loanInterestOn(borrow("cash", 10000))).toBeCloseTo(40, 8);
    const two = takeLoan({ hotelState: borrow("cash", 10000) }, "investment", 30000, { day: 1 }).hotelState;
    expect(loanInterestOn(two)).toBeCloseTo(40 + 30000 * 0.0018, 8);
  });

  it("falls as the loan is repaid", () => {
    const state = borrow("cash", 9000);
    expect(loanInterestOn(play(state, 10))).toBeLessThan(loanInterestOn(state));
  });

  it("an overdrawn account costs agios and a flat fee, each day it starts in the red", () => {
    const red = hotel({ finance: { revenue: [0], costs: [1000] } });
    expect(overdraftCostOn(red)).toBeCloseTo(1000 * OVERDRAFT_DAILY_RATE + OVERDRAFT_DAILY_FEE, 8);
    expect(overdraftCostOn(hotel({ finance: { revenue: [1000], costs: [1000] } }))).toBe(0);
    expect(overdraftCostOn(hotel())).toBe(0);
  });

  it("the bank's cost of the day is both", () => {
    const state = { ...borrow("cash", 10000, { finance: { revenue: [0], costs: [20000] } }) };
    expect(bankingCostOn(state)).toBeCloseTo(loanInterestOn(state) + overdraftCostOn(state), 8);
    expect(overdraftCostOn(state)).toBeGreaterThan(0);
  });
});

describe("bankingLoanEngine / paying a loan back day by day", () => {
  it("takes an equal slice of the principal out of the account each day", () => {
    const state = borrow("cash", 9000);
    const next = advanceBanking(state, { date: at(1), day: 2 });
    expect(loanOf(next).balance).toBeCloseTo(9000 - 300, 8);
    expect(next.banking.cashAdjustment).toBeCloseTo(9000 - 300, 8);
    expect(balanceOf(next)).toBeCloseTo(balanceOf(state) - 300, 8);
  });

  it("the principal is not an expense", () => {
    const state = borrow("cash", 9000);
    expect(advanceBanking(state, { date: at(1), day: 2 }).finance).toEqual(state.finance);
  });

  it("keeps a tally of the interest and the principal paid", () => {
    const next = play(borrow("cash", 9000), 3);
    expect(next.banking.ledger.principalPaid).toBeCloseTo(900, 8);
    expect(next.banking.ledger.interest).toBeCloseTo(9000 * 0.004 + 8700 * 0.004 + 8400 * 0.004, 8);
  });

  it("clears the loan on the last day, and the account gets back to where it started", () => {
    const start = hotel();
    const state = borrow("cash", 9000, undefined, 0);
    const done = play(state, 30);
    expect(activeLoans(done)).toEqual([]);
    expect(loanHistory(done)[0]).toMatchObject({ status: "repaid", early: false, balance: 0 });
    expect(done.banking.repaidLoans).toBe(1);
    expect(done.banking.cashAdjustment).toBeCloseTo(0, 6);
    // Only the fee is left of it, and the interest -- charged with the daily expenses.
    expect(balanceOf(done)).toBeCloseTo(balanceOf(start) - Math.round(9000 * ORIGINATION_FEE_RATE), 6);
  });

  it("the last slice never overpays", () => {
    const state = { ...borrow("cash", 5000), };
    const almost = { ...state, banking: { ...state.banking, loans: state.banking.loans.map((loan) => ({ ...loan, balance: 100 })) } };
    const done = advanceBanking(almost, { date: at(1), day: 2 });
    expect(loanHistory(done)[0].status).toBe("repaid");
    expect(done.banking.cashAdjustment).toBeCloseTo(5000 - 100, 8);
  });

  it("a loan repaid earns the bank's trust", () => {
    const state = borrow("cash", 5000);
    const before = creditScore(state);
    expect(creditScore(play(state, 30))).toBeGreaterThanOrEqual(before + 4);
  });

  it("has nothing to do when the loans are all repaid and the account is positive", () => {
    const done = play(borrow("cash", 5000), 30);
    expect(advanceBanking(done, { date: at(40), day: 40 })).toBe(done);
  });
});

describe("bankingLoanEngine / an account that cannot pay", () => {
  // Enough treasury to clear the 30% equity rule at origination (Lot 3);
  // drained() below then pins the account to whatever this test needs.
  const poor = () => borrow("investment", 30000, { finance: { revenue: [10000], costs: [0] } });
  // The account is drained by the day's expenses.
  const drained = (state, to) => ({ ...state, banking: { ...state.banking, cashAdjustment: to - (sumOf(state.finance.revenue) - sumOf(state.finance.costs)) } });
  const sumOf = (list) => list.reduce((a, b) => a + b, 0);

  it("counts a missed payment when the account cannot cover the instalment, with a late fee", () => {
    const state = drained(poor(), 100); // 100 EUR in the account, 333 due
    const next = advanceBanking(state, { date: at(1), day: 2 });
    const slice = 30000 / 90;
    expect(next.banking.missedPayments).toBe(1);
    expect(next.finance.costs[next.finance.costs.length - 1] - state.finance.costs[state.finance.costs.length - 1]).toBe(Math.round(slice * LATE_FEE_RATE));
    expect(next.banking.today).toMatchObject({ missed: true, lateFee: Math.round(slice * LATE_FEE_RATE) });
  });

  it("the payment is made all the same, and the account goes into the red", () => {
    const state = drained(poor(), 100);
    const next = advanceBanking(state, { date: at(1), day: 2 });
    expect(loanOf(next).balance).toBeCloseTo(30000 - 30000 / 90, 6);
    expect(isOverdrawn(next)).toBe(true);
  });

  it("no missed payment when the account can pay", () => {
    const next = advanceBanking(borrow("cash", 5000), { date: at(1), day: 2 });
    expect(next.banking.missedPayments).toBe(0);
    expect(next.banking.today.missed).toBe(false);
  });

  it("counts the days the account ends in the red", () => {
    const red = { ...hotel({ finance: { revenue: [0], costs: [5000] } }) };
    let state = advanceBanking(red, { date: at(1), day: 2 });
    expect(state.banking.overdraftDays).toBe(1);
    state = advanceBanking(state, { date: at(2), day: 3 });
    expect(state.banking.overdraftDays).toBe(2);
    expect(state.banking.today.overdrawn).toBe(true);
  });

  it("an account back in the black stops counting", () => {
    const state = advanceBanking(hotel({ finance: { revenue: [0], costs: [5000] } }), { date: at(1), day: 2 });
    const richer = { ...state, finance: { revenue: [90000], costs: [5000] } };
    expect(advanceBanking(richer, { date: at(2), day: 3 })).toBe(richer);
  });

  it("missed payments and days in the red lower the credit score", () => {
    const state = drained(poor(), 100);
    const next = advanceBanking(state, { date: at(1), day: 2 });
    expect(creditScore(next)).toBeLessThan(creditScore(state));
  });
});

describe("bankingLoanEngine / repaying early", () => {
  it("costs what is still owed plus a 1 % fee", () => {
    const state = play(borrow("investment", 30000), 10);
    const loan = loanOf(state);
    const cost = earlyRepayment(loan);
    expect(cost.balance).toBe(Math.round(loan.balance));
    expect(cost.fee).toBe(Math.round(loan.balance * EARLY_REPAY_FEE_RATE));
    expect(cost.total).toBe(cost.balance + cost.fee);
  });

  it("clears the loan, takes the money and the fee from the account", () => {
    const state = borrow("investment", 30000);
    const loan = loanOf(state);
    const next = repayLoan({ hotelState: state }, loan.id, { day: 3 }).hotelState;
    const cost = earlyRepayment(loan);
    expect(activeLoans(next)).toEqual([]);
    expect(loanHistory(next)[0]).toMatchObject({ status: "repaid", early: true, balance: 0, repaidDay: 3 });
    expect(next.banking.cashAdjustment).toBe(30000 - cost.balance);
    expect(balanceOf(next)).toBeCloseTo(balanceOf(state) - cost.balance - cost.fee, 8);
    expect(next.banking.repaidLoans).toBe(1);
    expect(lastOutcome(next).text).toMatch(/remboursé par anticipation/);
  });

  it("no more interest afterwards", () => {
    const state = borrow("cash", 5000);
    expect(loanInterestOn(repayLoan({ hotelState: state }, loanOf(state).id).hotelState)).toBe(0);
  });

  it("does nothing when the treasury cannot pay", () => {
    const state = borrow("investment", 30000);
    const poor = { ...state, finance: { revenue: [1000], costs: [0] }, banking: { ...state.banking, cashAdjustment: 0 } };
    const start = { hotelState: poor };
    expect(repayLoan(start, loanOf(poor).id)).toBe(start);
  });

  it("does nothing for an unknown loan, or one already repaid", () => {
    const state = borrow("cash", 5000);
    const start = { hotelState: state };
    expect(repayLoan(start, "loan:99")).toBe(start);
    const done = repayLoan(start, loanOf(state).id).hotelState;
    const again = { hotelState: done };
    expect(repayLoan(again, "loan:1")).toBe(again);
  });

  it("a hotel can borrow again once a loan is repaid", () => {
    const state = borrow("cash", 5000);
    const done = repayLoan({ hotelState: state }, loanOf(state).id).hotelState;
    expect(loanOptions(done).find((item) => item.type === "cash").available).toBe(true);
  });
});

describe("bankingLoanEngine / the day's news", () => {
  it("reports the instalment and the interest", () => {
    const next = advanceBanking(borrow("cash", 9000), { date: at(1), day: 2 });
    expect(bankingNewsOn(next, at(1))[0]).toMatch(/Prêts bancaires : 300 € de capital remboursé et 36 € d'intérêts\./);
  });

  it("announces a loan that is fully repaid", () => {
    const state = borrow("cash", 5000);
    const almost = { ...state, banking: { ...state.banking, loans: state.banking.loans.map((loan) => ({ ...loan, balance: 100 })) } };
    expect(bankingNewsOn(advanceBanking(almost, { date: at(1), day: 2 }), at(1)).join("\n")).toMatch(/Crédit de trésorerie entièrement remboursé/);
  });

  it("warns of a missed payment and an overdrawn account", () => {
    const state = borrow("investment", 30000, { finance: { revenue: [10000], costs: [0] } });
    // 100 EUR left in the account (the 333 EUR instalment can't be covered).
    const drained = { ...state, banking: { ...state.banking, cashAdjustment: 100 - 10000 } };
    const lines = bankingNewsOn(advanceBanking(drained, { date: at(1), day: 2 }), at(1)).join("\n");
    expect(lines).toMatch(/Échéance non couverte : pénalité de retard/);
    expect(lines).toMatch(/à découvert/);
  });

  it("says nothing of another day", () => {
    const next = advanceBanking(borrow("cash", 9000), { date: at(1), day: 2 });
    expect(bankingNewsOn(next, at(2))).toEqual([]);
  });
});

describe("bankingLoanEngine / how the interface reads it", () => {
  it("summarises the bank", () => {
    const described = describeBanking(hotel({ progression: { player: { reputation: 60 } }, expansion: { availableCapital: 5000 } }));
    expect(described).toMatchObject({ score: 70, stars: 4, balance: 80000, treasury: 80000, overdrawn: false, debt: 0, ceiling: 140000, capacity: 140000, solvency: null, dailyDue: 0, loans: [] });
    expect(described.rating.id).toBe("good");
    expect(described.options).toHaveLength(3);
  });

  it("describes each loan in progress", () => {
    const state = play(borrow("cash", 9000, undefined, 0), 10);
    const [loan] = describeBanking(state).loans;
    expect(loan).toMatchObject({ label: "Crédit de trésorerie", icon: "💶", daysLeft: 20, progressPercent: 33 });
    expect(loan.dailyPayment).toBeCloseTo(300 + loan.balance * 0.004, 2);
    expect(loan.repay.total).toBe(loan.repay.balance + loan.repay.fee);
  });

  it("gives the day's total due and the running tallies", () => {
    const state = play(borrow("cash", 9000), 2);
    const described = describeBanking(state);
    expect(described.dailyDue).toBe(Math.round(described.loans[0].dailyPayment));
    expect(described.ledger.principalPaid).toBe(600);
    expect(described.ledger.fees).toBe(90);
  });

  it("flags an overdrawn account", () => {
    const described = describeBanking(hotel({ finance: { revenue: [0], costs: [3000] } }));
    expect(described).toMatchObject({ overdrawn: true, balance: -3000, treasury: 0 });
  });

  it("copes with junk", () => {
    expect(describeBanking(undefined).loans).toEqual([]);
    expect(creditScore({ banking: "nope" })).toBeGreaterThan(0);
  });
});

describe("bankingLoanEngine / purity", () => {
  it("leaves its input alone and is deterministic", () => {
    const state = borrow("investment", 30000);
    const frozen = JSON.stringify(state);
    const first = advanceBanking(state, { date: at(1), day: 2 });
    const second = advanceBanking(state, { date: at(1), day: 2 });
    repayLoan({ hotelState: state }, "loan:1");
    describeBanking(state);
    expect(first).toEqual(second);
    expect(JSON.stringify(state)).toBe(frozen);
  });

  it("keeps a bounded history", () => {
    let state = hotel({ finance: { revenue: [900000], costs: [0] } });
    for (let i = 0; i < 20; i += 1) {
      state = takeLoan({ hotelState: state }, "cash", 5000, { day: i }).hotelState;
      state = repayLoan({ hotelState: state }, `loan:${i + 1}`).hotelState;
    }
    expect(state.banking.loans.length).toBeLessThanOrEqual(12);
    expect(state.banking.repaidLoans).toBe(20);
  });
});
