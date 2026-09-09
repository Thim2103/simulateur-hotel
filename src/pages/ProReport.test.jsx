import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProReport from "./ProReport";
import { useProEngine } from "../hooks/useProEngine";

jest.mock("../hooks/useProEngine");

// Chart.js needs a real canvas context, which jsdom doesn't provide; this
// page doesn't render charts itself but reuses shared UI components, so
// keep the mock for consistency with the other Pro pages.
jest.mock("react-chartjs-2", () => ({
  Line: () => <div data-testid="line-chart" />,
  Bar: () => <div data-testid="bar-chart" />,
  Pie: () => <div data-testid="pie-chart" />,
}));

function proState(overrides = {}) {
  return {
    proId: "pro-1",
    status: "completed",
    month: 24,
    horizonMonths: 24,
    hotelConfig: { positioningTier: "midscale", roomCount: 30, strategy: "optimisation" },
    performanceHistory: [{ month: 24, score: 78, occupancyRate: 72, risks: 1, opportunities: 2 }],
    phases: [{ id: "phase-1", title: "Phase 1" }],
    missions: [{ id: "m1", title: "Lancement stable", achieved: true }],
    objectives: [{ id: "o1", label: "Rester rentable", achieved: true }],
    crises: [{ id: "inflation", title: "Inflation", department: "finance", active: false }],
    opportunities: [{ id: "subvention", title: "Subvention", status: "seized", roiEstimate: 12000 }],
    audits: [{ department: "finance", score: 75, grade: "B", month: 24, findings: [] }],
    diagnostics: [{ type: "opportunity", severity: "low", message: "Bonne trajectoire." }],
    forecast: { horizonMonths: 24, scenarios: {} },
    score: { total: 78, grade: "B" },
    career: { playerId: "player-1", replayLog: { entries: [] }, scoreHistory: [], status: "active", day: 24 },
    ...overrides,
  };
}

function proHook(overrides = {}) {
  return {
    proState: null, isRunning: false, error: null,
    loadProState: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the Pro state on mount", () => {
  const loadProState = jest.fn().mockResolvedValue(null);
  useProEngine.mockReturnValue(proHook({ loadProState }));
  render(<ProReport />, { wrapper: MemoryRouter });
  expect(loadProState).toHaveBeenCalled();
});

test("prompts to create a program when no data yet", () => {
  useProEngine.mockReturnValue(proHook());
  render(<ProReport />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /créer mon programme/i })).toHaveAttribute("href", "/pro");
});

test("shows the final score, establishment info, crises, opportunities and diagnostics", () => {
  useProEngine.mockReturnValue(proHook({ proState: proState() }));
  render(<ProReport />, { wrapper: MemoryRouter });

  expect(screen.getByText("78/100")).toBeInTheDocument();
  expect(screen.getByText("Bonne trajectoire.")).toBeInTheDocument();
  expect(screen.getByText("Inflation")).toBeInTheDocument();
  expect(screen.getByText("Subvention")).toBeInTheDocument();
});

test("shows the replay table with the performance history", () => {
  useProEngine.mockReturnValue(proHook({ proState: proState() }));
  render(<ProReport />, { wrapper: MemoryRouter });

  expect(screen.getByText(/Replay complet \(1 mois\)/)).toBeInTheDocument();
  expect(screen.getByText(/Mois 24/)).toBeInTheDocument();
});
