// How the hotel pays for an investment (zone upgrades, new floors, fitting
// out rooms): from its available capital first (`expansion.availableCapital`,
// the pot set aside for growth), and if that is not enough, the shortfall
// comes out of the treasury -- what the hotel has actually earned so far
// (revenue minus costs, from `finance`). Nothing is ever paid from money the
// hotel does not have: if capital + treasury can't cover it, it isn't
// affordable.
//
// The treasury share is booked as a one-off cost of the current month (see
// oneOffCosts.debitCurrentMonth), so it really lowers the treasury and shows
// in the finance pages, exactly like a repair or a recruitment fee.
import { safeArray, safeNumber, safeObject } from "../safe";
import { debitCurrentMonth } from "./oneOffCosts";

const sum = (values) => safeArray(values).reduce((total, value) => total + safeNumber(value, 0), 0);

export function capitalOf(hotelState) {
  return Math.max(0, safeNumber(safeObject(safeObject(hotelState).expansion).availableCapital, 0));
}

// What the hotel has earned so far, net of everything it has spent. Never
// negative: a hotel in the red has no treasury to draw on (its capital is
// still usable).
export function treasuryOf(hotelState) {
  const finance = safeObject(safeObject(hotelState).finance);
  return Math.max(0, sum(finance.revenue) - sum(finance.costs));
}

export function availableFunds(hotelState) {
  return capitalOf(hotelState) + treasuryOf(hotelState);
}

// How `cost` would be split between capital and treasury.
export function fundingPlan(hotelState, cost) {
  const amount = Math.max(0, safeNumber(cost, 0));
  const fromCapital = Math.min(capitalOf(hotelState), amount);
  const fromTreasury = amount - fromCapital;
  return { affordable: fromTreasury <= treasuryOf(hotelState), fromCapital, fromTreasury };
}

export function canAfford(hotelState, cost) {
  return fundingPlan(hotelState, cost).affordable;
}

// Pays for an investment. Returns `{ hotelState, paid, fromCapital,
// fromTreasury }`; when it isn't affordable nothing changes and `paid` is
// false.
export function payInvestment(hotelState, cost) {
  const state = safeObject(hotelState);
  const plan = fundingPlan(state, cost);
  if (!plan.affordable) return { hotelState: state, paid: false, fromCapital: 0, fromTreasury: 0 };

  let next = { ...state, expansion: { ...safeObject(state.expansion), availableCapital: capitalOf(state) - plan.fromCapital } };
  if (plan.fromTreasury > 0) next = debitCurrentMonth(next, plan.fromTreasury);
  return { hotelState: next, paid: true, fromCapital: plan.fromCapital, fromTreasury: plan.fromTreasury };
}
