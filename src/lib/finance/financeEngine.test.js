import { createGuestHotelBundle } from "../guest";
import { applyFinancialDecision, FINANCE_ACTION_CATALOG, financeFromCareerState, findFinanceAction, runFinanceCycle } from "./financeEngine";
import { startCareer } from "../career/careerEngine";

function bundle() {
  return createGuestHotelBundle({ referenceDate: new Date("2026-09-10T12:00:00Z") });
}

describe("runFinanceCycle", () => {
  test("computes a full FinanceState from a hotel bundle", () => {
    const { state } = { state: runFinanceCycle({ hotelBundle: bundle() }) };
    expect(state.incomeStatement).toBeDefined();
    expect(state.balanceSheet).toBeDefined();
    expect(state.cashFlow).toBeDefined();
    expect(state.ratios).toBeDefined();
    expect(state.forecast.scenarios.realiste.days).toHaveLength(30);
    expect(state.cyclesElapsed).toBe(1);
  });

  test("records the cycle into the finance replay log", () => {
    const state = runFinanceCycle({ hotelBundle: bundle() });
    expect(state.replayLog.entries).toHaveLength(1);
    expect(state.replayLog.entries[0].cycleIndex).toBe(0);
  });

  test("rolls forward cash/cyclesElapsed from the previous state", () => {
    const first = runFinanceCycle({ hotelBundle: bundle() });
    const second = runFinanceCycle({ hotelBundle: bundle(), previousState: first });

    expect(second.cyclesElapsed).toBe(2);
    expect(second.replayLog.entries).toHaveLength(2);
  });
});

describe("applyFinancialDecision", () => {
  test("every catalog action can actually be applied", () => {
    FINANCE_ACTION_CATALOG.forEach((action) => {
      const next = applyFinancialDecision(bundle(), action.id);
      expect(next).toBeDefined();
    });
  });

  test("increase-marketing-budget raises the hotel's marketing budget", () => {
    const next = applyFinancialDecision(bundle(), "increase-marketing-budget", { amount: 500 });
    expect(next.hotelState.marketing.budget).toBeGreaterThan(bundle().hotelState.marketing.budget);
  });

  test("adjust-prices raises reservation prices", () => {
    const source = bundle();
    const next = applyFinancialDecision(source, "adjust-prices", { percent: 10 });
    next.reservations.forEach((reservation, index) => {
      expect(reservation.price).toBe(Math.round(source.reservations[index].price * 1.1));
    });
  });

  test("reduce-costs lowers fixed costs, and never mutates the input", () => {
    const source = bundle();
    const originalFixedCosts = source.hotelState.finance.fixedCosts;
    const next = applyFinancialDecision(source, "reduce-costs");
    expect(next.hotelState.finance.fixedCosts).toBeLessThan(originalFixedCosts);
    expect(source.hotelState.finance.fixedCosts).toBe(originalFixedCosts);
  });

  test("an unknown action id returns the bundle unchanged", () => {
    const source = bundle();
    expect(applyFinancialDecision(source, "does-not-exist")).toEqual(source);
  });

  test("findFinanceAction looks up an action by id", () => {
    expect(findFinanceAction("invest").category).toBe("investment");
    expect(findFinanceAction("does-not-exist")).toBeNull();
  });
});

describe("financeFromCareerState", () => {
  test("derives a FinanceState from a real CareerState's hotel bundle", () => {
    const career = startCareer({ playerId: "player-1", ...bundle() });
    const financeState = financeFromCareerState(career);

    expect(financeState.incomeStatement.revenues.total).toBeGreaterThan(0);
    expect(financeState.ratios.goppar).toBeDefined();
  });
});
