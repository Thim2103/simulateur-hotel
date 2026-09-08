import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TfeDashboard from "./TfeDashboard";
import { useTfeEngine } from "../hooks/useTfeEngine";

jest.mock("../hooks/useTfeEngine");

function tfeState(overrides = {}) {
  return {
    tfeId: "tfe-1",
    status: "active",
    month: 5,
    horizonMonths: 36,
    chapters: [{ id: "annee-1", title: "Année 1 : Lancement", startMonth: 1, endMonth: 12 }],
    score: { total: 68, grade: "C" },
    diagnostics: [{ type: "opportunity", severity: "low", message: "Performance TFE en bonne voie." }],
    performanceHistory: [{ month: 5, score: 68, risks: 1, opportunities: 2 }],
    forecast: { scenarios: { realiste: { months: [{ month: 1, score: 60 }] } } },
    ...overrides,
  };
}

function tfeHook(overrides = {}) {
  return {
    tfeState: null,
    isRunning: false,
    error: null,
    loadTfeState: jest.fn().mockResolvedValue(null),
    playTfeMonth: jest.fn().mockResolvedValue(null),
    applyTfeAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the TFE state on mount", () => {
  const loadTfeState = jest.fn().mockResolvedValue(null);
  useTfeEngine.mockReturnValue(tfeHook({ loadTfeState }));
  render(<TfeDashboard />, { wrapper: MemoryRouter });
  expect(loadTfeState).toHaveBeenCalled();
});

test("prompts to create an establishment when no TFE is in progress", () => {
  useTfeEngine.mockReturnValue(tfeHook());
  render(<TfeDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /créer mon établissement/i })).toHaveAttribute("href", "/tfe");
});

test("shows the TFE KPIs and diagnostics once a run is active", () => {
  useTfeEngine.mockReturnValue(tfeHook({ tfeState: tfeState() }));
  render(<TfeDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByText("68/100 (C)")).toBeInTheDocument();
  expect(screen.getByText("Performance TFE en bonne voie.")).toBeInTheDocument();
});

test("clicking 'Mois suivant' calls playTfeMonth", () => {
  const playTfeMonth = jest.fn().mockResolvedValue(null);
  useTfeEngine.mockReturnValue(tfeHook({ tfeState: tfeState(), playTfeMonth }));
  render(<TfeDashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /mois suivant/i }));
  expect(playTfeMonth).toHaveBeenCalled();
});

test("clicking a TFE action's 'Appliquer' calls applyTfeAction with its id", () => {
  const applyTfeAction = jest.fn().mockResolvedValue(null);
  useTfeEngine.mockReturnValue(tfeHook({ tfeState: tfeState(), applyTfeAction }));
  render(<TfeDashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getAllByRole("button", { name: /appliquer/i })[0]);
  expect(applyTfeAction).toHaveBeenCalledWith("plan-relance");
});

test("disables 'Mois suivant' and shows a completion banner once the TFE is completed", () => {
  useTfeEngine.mockReturnValue(tfeHook({ tfeState: tfeState({ status: "completed", month: 36 }) }));
  render(<TfeDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByRole("button", { name: /tfe terminé/i })).toBeDisabled();
  expect(screen.getByText(/tfe terminé !/i)).toBeInTheDocument();
});
