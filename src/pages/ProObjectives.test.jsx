import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProObjectives from "./ProObjectives";
import { useProEngine } from "../hooks/useProEngine";

jest.mock("../hooks/useProEngine");

function proState(overrides = {}) {
  return {
    month: 6,
    horizonMonths: 24,
    phases: [{ id: "phase-1", title: "Phase 1 : Lancement professionnel", startMonth: 1, endMonth: 6 }],
    objectives: [{ id: "occupancy-70", label: "Maintenir un taux d'occupation de 70%", achieved: true }],
    missions: [{ id: "stable-launch", title: "Lancement stable", description: "Atteindre l'équilibre financier.", achieved: false, completedOnMonth: null }],
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

test("prompts to create a program when no Pro run is in progress", () => {
  useProEngine.mockReturnValue(proHook());
  render(<ProObjectives />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /créer mon programme professionnel/i })).toHaveAttribute("href", "/pro");
});

test("shows objectives and missions with their progress", () => {
  useProEngine.mockReturnValue(proHook({ proState: proState() }));
  render(<ProObjectives />, { wrapper: MemoryRouter });

  expect(screen.getByText("Maintenir un taux d'occupation de 70%")).toBeInTheDocument();
  expect(screen.getByText("Lancement stable")).toBeInTheDocument();
  expect(screen.getByText("atteint")).toBeInTheDocument();
  expect(screen.getByText("en cours")).toBeInTheDocument();
});
