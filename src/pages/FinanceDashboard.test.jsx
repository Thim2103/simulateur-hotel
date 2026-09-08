import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FinanceDashboard from "./FinanceDashboard";
import { useCareerContext } from "../context/CareerContext";
import { useFinance } from "../hooks/useFinance";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useFinance");

function careerState(overrides = {}) {
  return {
    day: 3,
    status: "active",
    hotel: { hotelState: { finance: { months: ["jan", "feb"], revenue: [1000, 1200], costs: [500, 600] } } },
    missions: [{ id: "profit-streak", title: "Trois jours rentables", description: "Enchaîner trois journées de profit positif.", status: "accepted" }],
    objectives: [{ id: "first-profit", label: "Réaliser un premier jour rentable", achieved: true }],
    rewardsInbox: [],
    ...overrides,
  };
}

function financeState(overrides = {}) {
  return {
    incomeStatement: { revenues: { total: 144000 }, expenses: { total: 90000 }, gop: 80000, ebitda: 54000 },
    balanceSheet: { assets: { total: 500000 }, liabilities: { total: 200000 }, equity: { total: 300000 } },
    cashFlow: { operating: 40000, investing: 0, financing: -1000, net: 39000, closingCash: 89000 },
    ratios: { goppar: 20, revpar: 15, payrollRatio: 0.3, debtRatio: 0.4, liquidityRatio: 2 },
    diagnostics: [{ type: "opportunity", severity: "low", message: "Marge EBITDA solide." }],
    forecast: { scenarios: { realiste: { days: [{ day: 1, revenue: 4000, cash: 51000 }] } } },
    ...overrides,
  };
}

function careerHook(overrides = {}) {
  return {
    careerState: null,
    isRunning: false,
    error: null,
    startCareer: jest.fn().mockResolvedValue(careerState()),
    ...overrides,
  };
}

function financeHook(overrides = {}) {
  return {
    financeState: null,
    isRunning: false,
    error: null,
    loadFinanceState: jest.fn().mockResolvedValue(null),
    applyFinancialDecision: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the finance state on mount", () => {
  const loadFinanceState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook());
  useFinance.mockReturnValue(financeHook({ loadFinanceState }));
  render(<FinanceDashboard />, { wrapper: MemoryRouter });
  expect(loadFinanceState).toHaveBeenCalled();
});

test("prompts to start a career when none exists yet", () => {
  useCareerContext.mockReturnValue(careerHook());
  useFinance.mockReturnValue(financeHook());
  render(<FinanceDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument();
});

test("shows the income statement KPIs, ratios, diagnostics and career progression once loaded", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useFinance.mockReturnValue(financeHook({ financeState: financeState() }));
  render(<FinanceDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByText("144 000 €")).toBeInTheDocument(); // revenues
  expect(screen.getByText("80 000 €")).toBeInTheDocument(); // gop
  expect(screen.getByText("20 €")).toBeInTheDocument(); // goppar
  expect(screen.getByText("Marge EBITDA solide.")).toBeInTheDocument();
  expect(screen.getByText("Trois jours rentables")).toBeInTheDocument();
  expect(screen.getByText("Réaliser un premier jour rentable")).toBeInTheDocument();
});

test("clicking a financial action's 'Appliquer' calls applyFinancialDecision with its id", () => {
  const applyFinancialDecision = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useFinance.mockReturnValue(financeHook({ financeState: financeState(), applyFinancialDecision }));
  render(<FinanceDashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getAllByRole("button", { name: /appliquer/i })[0]);
  expect(applyFinancialDecision).toHaveBeenCalledWith("increase-marketing-budget");
});

test("links to the forecast and full report pages", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useFinance.mockReturnValue(financeHook({ financeState: financeState() }));
  render(<FinanceDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByRole("link", { name: /prévisions/i })).toHaveAttribute("href", "/finance/forecast");
  expect(screen.getByRole("link", { name: /rapport complet/i })).toHaveAttribute("href", "/finance/report");
});
