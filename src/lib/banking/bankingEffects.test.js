import { calculateExpenses } from "../dailyCycle/calculateExpenses";
import { updateFinance } from "../dailyCycle/updateFinance";
import { startCareer, runCareerDay } from "../career/careerEngine";
import { buildDailyReview } from "../dashboard/dailyReview";
import { urgentItems, buildStatusSummary } from "../dashboard/statusSummary";
import { launchProgram } from "../loyalty/loyaltyProgramEngine";
import { payInvestment, treasuryOf, balanceOf } from "../finance/investmentFunding";
import { takeLoan, repayLoan, activeLoans, describeBanking, creditScore, LOAN_TYPES, OVERDRAFT_DAILY_FEE } from "./bankingLoanEngine";

const START = "2026-09-14";
const rooms = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, number: String(100 + i), type: "standard", status: "libre", price: 120, capacity: 2, housekeeping_status: "clean" }));

const hotelState = (extra = {}) => ({
  finance: { revenue: [100000], costs: [0], months: {}, fixedCosts: 3000, payroll: 6000, ...(extra.finance || {}) },
  marketing: { budget: 0 },
  esg: {},
  structure: { starRating: 4 },
  ...Object.fromEntries(Object.entries(extra).filter(([key]) => key !== "finance")),
});
function career(extra = {}) {
  return startCareer({
    playerId: "p",
    startDate: START,
    hotelState: hotelState(extra),
    restaurantState: {
      finance: { revenue: [0], costs: [0], months: {}, fixedCosts: 0, rent: 0, taxes: 20 },
      menu: [{ price: 20, cost: 8, sales: 10 }],
      staff: [{ id: 1, name: "Ada", productivity: 80, satisfaction: 70 }],
      operations: [],
      marketing: { budget: 0 },
      esg: {},
    },
    rooms,
    reservations: [],
  });
}
const withLoan = (state, typeId, amount) => ({ ...state, hotel: { ...state.hotel, ...takeLoan(state.hotel, typeId, amount, { day: state.day }) } });
const total = (list) => list.reduce((a, b) => a + b, 0);

describe("banking / investing with borrowed money", () => {
  it("a loan makes an investment affordable that the treasury alone could not pay", () => {
    const poor = { finance: { revenue: [3000], costs: [0] }, structure: { starRating: 4 }, progression: { player: { reputation: 60 } } };
    expect(launchProgram({ hotelState: poor }, { day: 1 }).hotelState.loyalty).toBeUndefined();
    const lent = takeLoan({ hotelState: poor }, "cash", 5000, { day: 1 }).hotelState;
    expect(treasuryOf(lent)).toBeGreaterThanOrEqual(5000);
    expect(launchProgram({ hotelState: lent }, { day: 1 }).hotelState.loyalty.launched).toBe(true);
  });

  it("the funding of an investment draws on the money lent, like on any treasury", () => {
    const state = takeLoan({ hotelState: { finance: { revenue: [0], costs: [0] }, structure: { starRating: 4 } } }, "cash", 10000, { day: 1 }).hotelState;
    const paid = payInvestment(state, 4000);
    expect(paid.paid).toBe(true);
    expect(treasuryOf(paid.hotelState)).toBe(treasuryOf(state) - 4000);
  });

  it("repaying a loan gives the money back to the bank, not to the books", () => {
    const state = takeLoan({ hotelState: hotelState() }, "investment", 30000, { day: 1 }).hotelState;
    const done = repayLoan({ hotelState: state }, "loan:1").hotelState;
    expect(done.finance.revenue).toEqual(state.finance.revenue);
    expect(balanceOf(done)).toBeLessThan(balanceOf(state));
    expect(activeLoans(done)).toEqual([]);
  });
});

describe("banking / the expenses", () => {
  const expenses = (extra) => calculateExpenses({ hotelState: {}, restaurantState: {}, events: [], rooms, referenceDate: new Date(`${START}T12:00:00Z`), ...extra });

  it("adds the bank's cost to the variable costs and the total", () => {
    const plain = expenses({});
    const bank = expenses({ bankingCost: 120 });
    expect(bank.variable - plain.variable).toBe(120);
    expect(bank.total - plain.total).toBe(120);
    expect(bank.banking).toBe(120);
  });

  it("shows no such line without a loan or an overdraft", () => {
    expect(expenses({})).not.toHaveProperty("banking");
    expect(expenses({ bankingCost: 0 })).not.toHaveProperty("banking");
  });
});

describe("banking / through the career day", () => {
  it("a hotel that never borrowed has no bank state after a day", async () => {
    const { state } = await runCareerDay({ state: career(), rng: () => 0.999 });
    expect(state.hotel.hotelState.banking).toBeUndefined();
    expect(state.lastDayReport.expenses).not.toHaveProperty("banking");
  });

  it("the interest of the day is charged with the day's expenses", async () => {
    const { state } = await runCareerDay({ state: withLoan(career(), "cash", 10000), rng: () => 0.999 });
    expect(state.lastDayReport.expenses.banking).toBe(40);
  });

  it("the day's slice of the principal is paid back", async () => {
    const start = withLoan(career(), "cash", 9000);
    const { state } = await runCareerDay({ state: start, rng: () => 0.999 });
    const loan = activeLoans(state.hotel.hotelState)[0];
    expect(loan.balance).toBeCloseTo(9000 - 300, 6);
    expect(state.hotel.hotelState.banking.cashAdjustment).toBeCloseTo(9000 - 300, 6);
    expect(state.hotel.hotelState.banking.ledger.principalPaid).toBeCloseTo(300, 6);
  });

  it("the interest is a real expense: it lowers the account and shows in the finance costs", async () => {
    const plain = await runCareerDay({ state: career(), rng: () => 0.999 });
    const lent = await runCareerDay({ state: withLoan(career(), "cash", 10000), rng: () => 0.999 });
    const costs = (s) => total(s.hotel.hotelState.finance.costs);
    // 40 EUR of interest and the 100 EUR fee taken when the loan was made.
    expect(costs(lent.state) - costs(plain.state)).toBe(40 + 100);
  });

  it("the principal is not: revenue is untouched", async () => {
    const plain = await runCareerDay({ state: career(), rng: () => 0.999 });
    const lent = await runCareerDay({ state: withLoan(career(), "cash", 10000), rng: () => 0.999 });
    expect(total(lent.state.hotel.hotelState.finance.revenue)).toBe(total(plain.state.hotel.hotelState.finance.revenue));
  });

  it("the daily review tells the player about the instalment", async () => {
    const { state } = await runCareerDay({ state: withLoan(career(), "cash", 9000), rng: () => 0.999 });
    const review = buildDailyReview({ careerState: state, dashboardState: { kpis: { revenueToday: 0, profit: 0, satisfaction: 3, staffMorale: 50, occupancyRate: 0, date: "d" } } });
    expect(review.causalChain.join("\n")).toMatch(/Prêts bancaires : 300 € de capital remboursé et 36 € d'intérêts/);
  });

  it("a hotel in the red pays agios and a fee every day, and its days in the red are counted", async () => {
    const red = career({ finance: { revenue: [0], costs: [20000], months: {}, fixedCosts: 3000, payroll: 6000 } });
    const first = await runCareerDay({ state: red, rng: () => 0.999 });
    expect(first.state.lastDayReport.expenses.banking).toBeGreaterThan(OVERDRAFT_DAILY_FEE);
    expect(first.state.hotel.hotelState.banking.overdraftDays).toBe(1);
    const second = await runCareerDay({ state: first.state, rng: () => 0.999 });
    expect(second.state.hotel.hotelState.banking.overdraftDays).toBe(2);
    expect(second.state.lastDayReport.expenses.banking).toBeGreaterThan(OVERDRAFT_DAILY_FEE);
  });

  it("the overdraft is reported to the player as a priority alert", async () => {
    const red = career({ finance: { revenue: [0], costs: [20000], months: {}, fixedCosts: 3000, payroll: 6000 } });
    const items = urgentItems(red);
    expect(items[0]).toMatchObject({ id: "overdraft", kind: "banking", tone: "danger", priority: true, to: "/dashboard#banking" });
    expect(items[0].label).toMatch(/Compte à découvert : environ \d+ € d'agios par jour/);
    expect(buildStatusSummary(red).notificationCount).toBeGreaterThan(0);
  });

  it("no alert for a healthy account", () => {
    expect(urgentItems(career()).map((item) => item.id)).not.toContain("overdraft");
  });

  it("a short credit is repaid in thirty days and the score climbs", async () => {
    let state = withLoan(career({ progression: { player: { reputation: 60 } } }), "cash", 5000);
    const before = creditScore(state.hotel.hotelState);
    for (let i = 0; i < LOAN_TYPES.cash.termDays; i += 1) ({ state } = await runCareerDay({ state, rng: () => 0.999 }));
    const bank = describeBanking(state.hotel.hotelState);
    expect(bank.loans).toEqual([]);
    expect(bank.repaidLoans).toBe(1);
    expect(state.hotel.hotelState.banking.cashAdjustment).toBeCloseTo(0, 4);
    expect(creditScore(state.hotel.hotelState)).toBeGreaterThanOrEqual(before);
  }, 60000);

  it("is deterministic", async () => {
    const run = () => runCareerDay({ state: withLoan(career(), "investment", 30000), rng: () => 0.999 });
    const [a, b] = await Promise.all([run(), run()]);
    expect(a.state.hotel.hotelState.banking).toEqual(b.state.hotel.hotelState.banking);
  });
});

describe("banking / the bank's cost is the hotel's", () => {
  const split = (extra) => updateFinance({ hotelState: { finance: { revenue: [0], costs: [0] } }, restaurantState: { finance: { revenue: [0], costs: [0] } }, hotelRevenue: 100, restaurantRevenue: 100, expenses: 300, referenceDate: new Date(`${START}T12:00:00Z`), ...extra });

  it("is shared by revenue like any other expense without the banking line", () => {
    const { hotelFinance, restaurantFinance } = split({});
    expect(hotelFinance.costs).toEqual([150]);
    expect(restaurantFinance.costs).toEqual([150]);
  });

  it("goes entirely to the hotel's ledger when it is the bank's", () => {
    const { hotelFinance, restaurantFinance } = split({ banking: 100 });
    expect(hotelFinance.costs).toEqual([200]);
    expect(restaurantFinance.costs).toEqual([100]);
  });

  it("never takes more than the day's expenses", () => {
    const { hotelFinance, restaurantFinance } = split({ banking: 900 });
    expect(hotelFinance.costs[0] + restaurantFinance.costs[0]).toBe(300);
  });

  it("comes after the upkeep, which is the hotel's too", () => {
    const { hotelFinance } = split({ maintenance: 100, banking: 100 });
    expect(hotelFinance.costs).toEqual([250]);
  });
});
