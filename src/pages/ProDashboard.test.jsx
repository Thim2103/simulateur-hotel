import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProDashboard from "./ProDashboard";
import { useProEngine } from "../hooks/useProEngine";

jest.mock("../hooks/useProEngine");

function proState(overrides = {}) {
  return {
    proId: "pro-1",
    status: "active",
    month: 5,
    horizonMonths: 24,
    phases: [{ id: "phase-1", title: "Phase 1 : Lancement professionnel", startMonth: 1, endMonth: 6 }],
    score: { total: 68, grade: "C" },
    diagnostics: [{ type: "opportunity", severity: "low", message: "Performance professionnelle en bonne voie." }],
    performanceHistory: [{ month: 5, score: 68, risks: 1, opportunities: 2 }],
    forecast: { scenarios: { realiste: { months: [{ month: 1, score: 60 }] } } },
    crises: [{ id: "inflation", active: true }],
    opportunities: [{ id: "subvention", status: "available" }],
    ...overrides,
  };
}

function proHook(overrides = {}) {
  return {
    proState: null,
    isRunning: false,
    error: null,
    loadProState: jest.fn().mockResolvedValue(null),
    playProMonth: jest.fn().mockResolvedValue(null),
    applyProAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the Pro state on mount", () => {
  const loadProState = jest.fn().mockResolvedValue(null);
  useProEngine.mockReturnValue(proHook({ loadProState }));
  render(<ProDashboard />, { wrapper: MemoryRouter });
  expect(loadProState).toHaveBeenCalled();
});

test("prompts to create a program when no Pro run is in progress", () => {
  useProEngine.mockReturnValue(proHook());
  render(<ProDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /créer mon programme professionnel/i })).toHaveAttribute("href", "/pro");
});

test("shows the Pro KPIs and diagnostics once a run is active", () => {
  useProEngine.mockReturnValue(proHook({ proState: proState() }));
  render(<ProDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByText("68/100 (C)")).toBeInTheDocument();
  expect(screen.getByText("Performance professionnelle en bonne voie.")).toBeInTheDocument();
  expect(screen.getByText("Crises actives")).toBeInTheDocument();
});

test("clicking 'Mois suivant' calls playProMonth", () => {
  const playProMonth = jest.fn().mockResolvedValue(null);
  useProEngine.mockReturnValue(proHook({ proState: proState(), playProMonth }));
  render(<ProDashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /mois suivant/i }));
  expect(playProMonth).toHaveBeenCalled();
});

test("clicking a Pro action's 'Appliquer' calls applyProAction with its id", () => {
  const applyProAction = jest.fn().mockResolvedValue(null);
  useProEngine.mockReturnValue(proHook({ proState: proState(), applyProAction }));
  render(<ProDashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getAllByRole("button", { name: /appliquer/i })[0]);
  expect(applyProAction).toHaveBeenCalledWith("plan-relance-globale");
});

test("disables 'Mois suivant' and shows a completion banner once the Pro run is completed", () => {
  useProEngine.mockReturnValue(proHook({ proState: proState({ status: "completed", month: 24 }) }));
  render(<ProDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByRole("button", { name: /programme terminé/i })).toBeDisabled();
  expect(screen.getByText(/programme terminé !/i)).toBeInTheDocument();
});

test("links to crises, opportunities, audits, objectives, forecast and report pages", () => {
  useProEngine.mockReturnValue(proHook({ proState: proState() }));
  render(<ProDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByRole("link", { name: /crises/i })).toHaveAttribute("href", "/pro/crises");
  expect(screen.getByRole("link", { name: /opportunités/i })).toHaveAttribute("href", "/pro/opportunities");
  expect(screen.getByRole("link", { name: /audits/i })).toHaveAttribute("href", "/pro/audits");
  expect(screen.getByRole("link", { name: /objectifs/i })).toHaveAttribute("href", "/pro/objectives");
  expect(screen.getByRole("link", { name: /prévisions/i })).toHaveAttribute("href", "/pro/forecast");
  expect(screen.getByRole("link", { name: /^rapport$/i })).toHaveAttribute("href", "/pro/report");
});
