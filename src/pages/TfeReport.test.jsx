import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TfeReport from "./TfeReport";
import { useTfeEngine } from "../hooks/useTfeEngine";

jest.mock("../hooks/useTfeEngine");

function tfeState(overrides = {}) {
  return {
    tfeId: "tfe-1",
    status: "completed",
    month: 36,
    horizonMonths: 36,
    hotelConfig: { positioningTier: "midscale", roomCount: 30, strategy: "rentabilite" },
    score: { total: 71, grade: "C" },
    diagnostics: [{ type: "risk", severity: "medium", message: "Trésorerie tendue." }],
    performanceHistory: [{ month: 36, score: 71, occupancyRate: 68, risks: 1, opportunities: 3 }],
    career: { hotel: {}, replayLog: [{ day: 1 }] },
    report: null,
    ...overrides,
  };
}

function tfeHook(overrides = {}) {
  return {
    tfeState: null,
    isRunning: false,
    error: null,
    loadTfeState: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the TFE state on mount", () => {
  const loadTfeState = jest.fn().mockResolvedValue(null);
  useTfeEngine.mockReturnValue(tfeHook({ loadTfeState }));
  render(<TfeReport />, { wrapper: MemoryRouter });
  expect(loadTfeState).toHaveBeenCalled();
});

test("prompts to create an establishment when no TFE is in progress", () => {
  useTfeEngine.mockReturnValue(tfeHook());
  render(<TfeReport />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /créer mon établissement/i })).toHaveAttribute("href", "/tfe");
});

test("shows the final score, hotel config, diagnostics and replay months once a run is active", () => {
  useTfeEngine.mockReturnValue(tfeHook({ tfeState: tfeState() }));
  render(<TfeReport />, { wrapper: MemoryRouter });

  expect(screen.getByText("71/100")).toBeInTheDocument();
  expect(screen.getByText(/mention : c/i)).toBeInTheDocument();
  expect(screen.getByText(/30 chambres/)).toBeInTheDocument();
  expect(screen.getByText("Trésorerie tendue.")).toBeInTheDocument();
  expect(screen.getByText(/mois 36 · score 71/i)).toBeInTheDocument();
});

test("clicking 'Exporter en HTML' opens a blob URL in a new tab", () => {
  useTfeEngine.mockReturnValue(tfeHook({ tfeState: tfeState() }));
  const originalCreateObjectURL = URL.createObjectURL;
  const originalOpen = window.open;
  URL.createObjectURL = jest.fn().mockReturnValue("blob:mock-url");
  window.open = jest.fn();

  render(<TfeReport />, { wrapper: MemoryRouter });
  fireEvent.click(screen.getByRole("button", { name: /exporter en html/i }));

  expect(URL.createObjectURL).toHaveBeenCalled();
  expect(window.open).toHaveBeenCalledWith("blob:mock-url", "_blank", "noopener,noreferrer");

  URL.createObjectURL = originalCreateObjectURL;
  window.open = originalOpen;
});
