import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FinanceForecast from "./FinanceForecast";
import { useFinance } from "../hooks/useFinance";

jest.mock("../hooks/useFinance");

function scenario(profit) {
  return {
    days: Array.from({ length: 30 }, (_, index) => ({ day: index + 1, revenue: 4000 + index, expenses: 3000, profit: 1000 + index, cash: 50000 + (index + 1) * (1000 + index) })),
    totalRevenue: 120000,
    totalExpenses: 90000,
    totalProfit: profit,
    closingCash: 50000 + profit,
  };
}

function forecast() {
  return {
    horizonDays: 30,
    scenarios: {
      optimiste: scenario(35000),
      realiste: scenario(30000),
      pessimiste: scenario(25000),
    },
  };
}

function financeHook(overrides = {}) {
  return {
    financeState: null,
    isRunning: false,
    error: null,
    loadFinanceState: jest.fn().mockResolvedValue(null),
    getFinancialForecast: jest.fn(() => null),
    ...overrides,
  };
}

test("loads the finance state on mount", () => {
  const loadFinanceState = jest.fn().mockResolvedValue(null);
  useFinance.mockReturnValue(financeHook({ loadFinanceState }));
  render(<FinanceForecast />, { wrapper: MemoryRouter });
  expect(loadFinanceState).toHaveBeenCalled();
});

test("shows a placeholder before any forecast exists", () => {
  useFinance.mockReturnValue(financeHook());
  render(<FinanceForecast />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune prévision/i)).toBeInTheDocument();
});

test("shows the 'réaliste' scenario by default", () => {
  useFinance.mockReturnValue(financeHook({ financeState: {}, getFinancialForecast: () => forecast() }));
  render(<FinanceForecast />, { wrapper: MemoryRouter });

  expect(screen.getByRole("tab", { name: "Réaliste" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("80 000 €")).toBeInTheDocument(); // closing cash: 50000+30000
});

test("switching scenarios updates the KPIs shown", () => {
  useFinance.mockReturnValue(financeHook({ financeState: {}, getFinancialForecast: () => forecast() }));
  render(<FinanceForecast />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("tab", { name: "Optimiste" }));

  expect(screen.getByRole("tab", { name: "Optimiste" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("85 000 €")).toBeInTheDocument(); // optimiste closing cash: 50000+35000
});

test("shows a profit comparison across the three scenarios", () => {
  useFinance.mockReturnValue(financeHook({ financeState: {}, getFinancialForecast: () => forecast() }));
  render(<FinanceForecast />, { wrapper: MemoryRouter });

  expect(screen.getByText(/profit prévu : 35 000 €/i)).toBeInTheDocument();
  expect(screen.getByText(/profit prévu : 30 000 €/i)).toBeInTheDocument();
  expect(screen.getByText(/profit prévu : 25 000 €/i)).toBeInTheDocument();
});
