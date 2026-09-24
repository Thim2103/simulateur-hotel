// Bumps the CURRENT month's cost total by `amount` -- the only shape that
// survives lib/dailyCycle/updateFinance.js's own next accumulate pass (its
// `Number(value) || 0` map over `finance.costs` would silently zero out
// anything shaped as an object, so a labelled `{id, amount}` entry is NOT
// safe). Mirrors the accumulation pattern useHotelSimulator.js/
// updateFinance.js already use: `costs` is a flat array of plain numbers,
// one per month, and a same-month cost is folded into its last entry.
// Shared by every one-off spend (incident repairs, recruitment fees,
// severance, training) so they all land in the same place.
import { safeArray, safeObject } from "../safe.js";

export function debitCurrentMonth(hotelState, amount) {
  const state = safeObject(hotelState);
  const finance = safeObject(state.finance);
  const costs = safeArray(finance.costs).map((value) => Number(value) || 0);
  if (costs.length === 0) costs.push(0);
  const lastIndex = costs.length - 1;
  const nextCosts = costs.map((value, index) => (index === lastIndex ? value + amount : value));
  return { ...state, finance: { ...finance, costs: nextCosts } };
}
