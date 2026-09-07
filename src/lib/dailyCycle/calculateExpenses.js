// Daily expenses: hotel.finance/restaurant.finance carry monthly figures
// (fixedCosts, payroll, rent, marketing budget, ESG investment); this
// prorates them to a single day and adds any one-off costs raised by
// today's events (equipment failures, extra staffing, etc.).
const DAYS_PER_MONTH = 30;

function perDay(monthlyAmount) {
  return Number(monthlyAmount || 0) / DAYS_PER_MONTH;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function eventCosts(events) {
  return safeArray(events).reduce((sum, event) => sum + Number(event?.impact?.cost || 0), 0);
}

// Splits today's spend into fixed (rent, base payroll, fixed costs) and
// variable (marketing, ESG investment, restaurant staff payroll, one-off
// event costs) so the daily report can show where money is going.
export function calculateExpenses({ hotelState = {}, restaurantState = {}, events = [] } = {}) {
  const hotelFinance = hotelState.finance || {};
  const restaurantFinance = restaurantState.finance || {};
  const restaurantStaff = safeArray(restaurantState.staff);

  const fixed =
    perDay(hotelFinance.fixedCosts) +
    perDay(hotelFinance.payroll) +
    perDay(restaurantFinance.fixedCosts) +
    perDay(restaurantFinance.rent);

  const restaurantPayroll = restaurantStaff.reduce((sum, person) => sum + Number(person.salary || 0), 0);

  const variable =
    perDay(hotelState.marketing?.budget) +
    perDay(hotelState.esg?.monthlyInvestment) +
    perDay(restaurantState.marketing?.budget) +
    perDay(restaurantState.esg?.monthlyInvestment) +
    perDay(restaurantPayroll) +
    eventCosts(events);

  const total = fixed + variable;

  return {
    fixed: Math.round(fixed),
    variable: Math.round(variable),
    eventCosts: Math.round(eventCosts(events)),
    total: Math.round(total),
  };
}
