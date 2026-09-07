import { calculateExpenses } from "./calculateExpenses";

test("prorates monthly fixed costs, payroll and rent to a single day", () => {
  const result = calculateExpenses({
    hotelState: { finance: { fixedCosts: 3000, payroll: 6000 } },
    restaurantState: { finance: { fixedCosts: 900, rent: 600 }, staff: [] },
  });

  // (3000 + 6000 + 900 + 600) / 30
  expect(result.fixed).toBe(Math.round((3000 + 6000 + 900 + 600) / 30));
});

test("includes marketing budget, ESG investment and restaurant payroll in variable costs", () => {
  const result = calculateExpenses({
    hotelState: { finance: {}, marketing: { budget: 3000 }, esg: { monthlyInvestment: 600 } },
    restaurantState: { finance: {}, staff: [{ salary: 3000 }, { salary: 2000 }], marketing: { budget: 0 }, esg: {} },
  });

  const expectedVariable = 3000 / 30 + 600 / 30 + (3000 + 2000) / 30;
  expect(result.variable).toBe(Math.round(expectedVariable));
});

test("adds today's event costs on top of the prorated variable costs", () => {
  const withoutEvents = calculateExpenses({ hotelState: { finance: {} }, restaurantState: { finance: {}, staff: [] } });
  const withEvents = calculateExpenses({
    hotelState: { finance: {} },
    restaurantState: { finance: {}, staff: [] },
    events: [{ impact: { expenses: 450 } }, { impact: { expenses: 90 } }],
  });

  expect(withEvents.eventCosts).toBe(540);
  expect(withEvents.total).toBe(withoutEvents.total + 540);
});

test("total is fixed + variable", () => {
  const result = calculateExpenses({ hotelState: { finance: { fixedCosts: 300 } }, restaurantState: { finance: {}, staff: [] } });
  expect(result.total).toBe(result.fixed + result.variable);
});
