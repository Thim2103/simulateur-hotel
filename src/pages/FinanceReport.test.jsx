import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FinanceReport from "./FinanceReport";
import { useFinance } from "../hooks/useFinance";

jest.mock("../hooks/useFinance");

function financeState(overrides = {}) {
  return {
    period: "2026-09-10",
    incomeStatement: {
      revenues: { hotel: 120000, restaurant: 24000, total: 144000 },
      expenses: { variable: 57600, payroll: 6000, fixed: 3500, total: 67100 },
      gop: 86400,
      ebitda: 76900,
      netIncome: 60000,
    },
    balanceSheet: {
      assets: { cash: 89000, receivables: 2000, fixedAssets: 145000, total: 236000 },
      liabilities: { payables: 3000, debt: 56000, total: 59000 },
      equity: { total: 177000 },
    },
    cashFlow: { operating: 65000, investing: 0, financing: -1000, closingCash: 89000 },
    ratios: { goppar: 20 },
    diagnostics: [{ type: "error", severity: "high", message: "Résultat net négatif." }],
    replayLog: { entries: [{ cycleIndex: 0, period: "2026-09-09", incomeStatement: { gop: 80000, revenues: { total: 140000 }, expenses: { total: 90000 }, netIncome: 50000 } }] },
    forecast: null,
    ...overrides,
  };
}

function financeHook(overrides = {}) {
  return {
    financeState: null,
    isRunning: false,
    error: null,
    loadFinanceState: jest.fn().mockResolvedValue(null),
    getFinancialReport: jest.fn(() => ({ period: null, incomeStatement: null, balanceSheet: null, cashFlow: null, ratios: null, diagnostics: [], forecast: null, replay: { totalCycles: 0, entries: [] } })),
    ...overrides,
  };
}

test("loads the finance state on mount", () => {
  const loadFinanceState = jest.fn().mockResolvedValue(null);
  useFinance.mockReturnValue(financeHook({ loadFinanceState }));
  render(<FinanceReport />, { wrapper: MemoryRouter });
  expect(loadFinanceState).toHaveBeenCalled();
});

test("shows a placeholder before any finance cycle exists", () => {
  useFinance.mockReturnValue(financeHook());
  render(<FinanceReport />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune donnée financière/i)).toBeInTheDocument();
});

test("shows the income statement, balance sheet and cash-flow sections once loaded", () => {
  const state = financeState();
  useFinance.mockReturnValue(
    financeHook({
      financeState: state,
      getFinancialReport: jest.fn(() => ({ ...state, replay: { totalCycles: 1, entries: state.replayLog.entries } })),
    })
  );
  render(<FinanceReport />, { wrapper: MemoryRouter });

  expect(screen.getByText(/GOP : 86 400 €/)).toBeInTheDocument();
  expect(screen.getByText(/Capitaux propres : 177 000 €/)).toBeInTheDocument();
  expect(screen.getByText(/Trésorerie de clôture : 89 000 €/)).toBeInTheDocument();
  expect(screen.getByText("Résultat net négatif.")).toBeInTheDocument();
});

test("shows the finance replay log and lets you inspect a past cycle", () => {
  const state = financeState();
  useFinance.mockReturnValue(
    financeHook({
      financeState: state,
      getFinancialReport: jest.fn(() => ({ ...state, replay: { totalCycles: 1, entries: state.replayLog.entries } })),
    })
  );
  render(<FinanceReport />, { wrapper: MemoryRouter });

  const cycleButton = screen.getByRole("button", { name: /cycle 1/i });
  expect(cycleButton).toBeInTheDocument();
  fireEvent.click(cycleButton);
  expect(screen.getByText(/résultat net 50 000 €/i)).toBeInTheDocument();
});

test("clicking 'Exporter en HTML' opens the exported report in a new tab", () => {
  const state = financeState();
  useFinance.mockReturnValue(
    financeHook({
      financeState: state,
      getFinancialReport: jest.fn(() => ({ ...state, replay: { totalCycles: 1, entries: state.replayLog.entries } })),
    })
  );
  const openSpy = jest.spyOn(window, "open").mockImplementation(() => {});
  URL.createObjectURL = jest.fn(() => "blob:mock-url");

  render(<FinanceReport />, { wrapper: MemoryRouter });
  fireEvent.click(screen.getByRole("button", { name: /exporter en html/i }));

  expect(openSpy).toHaveBeenCalledWith("blob:mock-url", "_blank", "noopener,noreferrer");
  openSpy.mockRestore();
});
