import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RestaurantSimulator from "./RestaurantSimulator";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";
import { useRestaurant } from "../hooks/useRestaurant";

jest.mock("../hooks/useRestaurantSimulator");
jest.mock("../hooks/useRestaurant");

function baseProgression(overrides = {}) {
  return { ready: false, playerLevel: 1, xp: 0, tutorials: [], achievements: [], difficulty: "easy", currentLevel: 0, modules: [], nextUnlock: "", ...overrides };
}

function baseSimulatorHook(overrides = {}) {
  return {
    progression: baseProgression(),
    setDifficulty: jest.fn(),
    loading: false,
    error: null,
    ...overrides,
  };
}

beforeEach(() => {
  useRestaurant.mockReturnValue({
    restaurantState: { structure: { name: "", concept: "", location: "", capacity: 0 }, progression: { ready: false } },
    loading: false,
    error: null,
    loadRestaurantState: jest.fn().mockResolvedValue(undefined),
    submitStructure: jest.fn(),
  });
});

test("shows only the Structure form and no tab bar while the establishment isn't ready", () => {
  useRestaurantSimulator.mockReturnValue(baseSimulatorHook());
  render(<RestaurantSimulator />, { wrapper: MemoryRouter });

  expect(screen.getByText(/structure de l'établissement/i)).toBeInTheDocument();
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
});

test("shows the full tab bar once the establishment is ready", () => {
  useRestaurantSimulator.mockReturnValue(baseSimulatorHook({ progression: baseProgression({ ready: true }) }));
  render(<RestaurantSimulator />, { wrapper: MemoryRouter });

  expect(screen.getByRole("tablist")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /marketing/i })).toBeInTheDocument();
});

test("shows an error banner instead of offline/mocked data when the load fails", () => {
  useRestaurantSimulator.mockReturnValue(baseSimulatorHook({ error: new Error("Supabase indisponible") }));
  render(<RestaurantSimulator />, { wrapper: MemoryRouter });

  expect(screen.getByText(/supabase indisponible/i)).toBeInTheDocument();
  expect(screen.queryByText(/mode hors-ligne/i)).not.toBeInTheDocument();
});
