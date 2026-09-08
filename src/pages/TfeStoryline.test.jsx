import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TfeStoryline from "./TfeStoryline";
import { useTfeEngine } from "../hooks/useTfeEngine";

jest.mock("../hooks/useTfeEngine");

function tfeState(overrides = {}) {
  return {
    tfeId: "tfe-1",
    status: "active",
    month: 4,
    horizonMonths: 36,
    chapters: [
      { id: "annee-1", title: "Année 1 : Lancement", startMonth: 1, endMonth: 12 },
      { id: "annee-2", title: "Année 2 : Consolidation", startMonth: 13, endMonth: 24 },
    ],
    missions: [
      { id: "stable-launch", chapterId: "annee-1", title: "Lancement stable", description: "…", achieved: true, completedOnMonth: 2 },
      { id: "team-cohesion", chapterId: "annee-1", title: "Cohésion d'équipe", description: "…", achieved: false, completedOnMonth: null },
    ],
    objectives: [{ id: "always-profitable", label: "Toujours rentable", achieved: false }],
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
  render(<TfeStoryline />, { wrapper: MemoryRouter });
  expect(loadTfeState).toHaveBeenCalled();
});

test("prompts to create an establishment when no TFE is in progress", () => {
  useTfeEngine.mockReturnValue(tfeHook());
  render(<TfeStoryline />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /créer mon établissement/i })).toHaveAttribute("href", "/tfe");
});

test("shows chapters, missions and objectives once a run is active", () => {
  useTfeEngine.mockReturnValue(tfeHook({ tfeState: tfeState() }));
  render(<TfeStoryline />, { wrapper: MemoryRouter });

  expect(screen.getByText("Année 1 : Lancement")).toBeInTheDocument();
  expect(screen.getByText("Lancement stable")).toBeInTheDocument();
  expect(screen.getByText(/réussie \(mois 2\)/i)).toBeInTheDocument();
  expect(screen.getByText("Toujours rentable")).toBeInTheDocument();
});
