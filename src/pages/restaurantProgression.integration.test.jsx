// Integration test for the Restaurant progression fix: validating the
// "Structure de l'établissement" form must unblock every other restaurant
// tab immediately, without a full page reload.
//
// Before the fix: RestaurantStructure.jsx persisted progression.ready =
// true through its own useRestaurant() hook instance (see
// hooks/useRestaurant.js's submitStructure()) while RestaurantSimulator.jsx's
// gate kept reading a separate useRestaurantSimulator() instance (see
// hooks/useRestaurantSimulator.js, built on useSupabaseRestaurant) that
// was never told to re-fetch -- both hooks read/write the same underlying
// `restaurants.progression` row (see restaurantRepository.js), but only
// one of them was told a write had happened. The player stayed stuck on
// Étape 1 until a full page reload.
//
// This exercises the real component tree (RestaurantSimulator +
// RestaurantStructure, not mocked) against a mocked useRestaurant()/
// useRestaurantSimulator() pair, so the test can assert the fix's own
// wiring precisely: submitting the form must call RestaurantSimulator's
// own reload() and then navigate to the Menu tab. A brand-new (non-guest)
// restaurant is what actually reproduces this: guest mode seeds an
// already-ready establishment (see lib/guest/guestAdapter.js), so it
// can't exercise the "stuck on Étape 1" gate at all.
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RestaurantSimulator from "./RestaurantSimulator";
import { useRestaurantSimulator } from "../hooks/useRestaurantSimulator";
import { useRestaurant } from "../hooks/useRestaurant";

jest.mock("../hooks/useRestaurantSimulator");
jest.mock("../hooks/useRestaurant");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

function baseProgression(overrides = {}) {
  return { ready: false, playerLevel: 1, xp: 0, tutorials: [], achievements: [], difficulty: "easy", currentLevel: 0, modules: [], nextUnlock: "", ...overrides };
}

beforeEach(() => {
  mockNavigate.mockClear();
});

test("validating the establishment reloads RestaurantSimulator's own progression and navigates to the Menu tab", async () => {
  const reload = jest.fn().mockResolvedValue(undefined);
  useRestaurantSimulator.mockReturnValue({
    progression: baseProgression(),
    setDifficulty: jest.fn(),
    loading: false,
    error: null,
    reload,
  });

  const submitStructure = jest.fn().mockResolvedValue({ valid: true, errors: [] });
  useRestaurant.mockReturnValue({
    restaurantState: { structure: { name: "", concept: "", location: "", capacity: 0 }, progression: { ready: false } },
    loading: false,
    error: null,
    loadRestaurantState: jest.fn().mockResolvedValue(undefined),
    submitStructure,
  });

  render(<RestaurantSimulator />, { wrapper: MemoryRouter });

  // Étape 1: still gated -- no tab bar yet.
  expect(screen.getByText(/structure de l'établissement/i)).toBeInTheDocument();
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText(/le central/i), { target: { value: "Le Central" } });
  fireEvent.change(screen.getByPlaceholderText(/bistro moderne/i), { target: { value: "Bistro moderne" } });
  fireEvent.change(screen.getByPlaceholderText(/lyon, france/i), { target: { value: "Lyon, France" } });
  fireEvent.change(screen.getByPlaceholderText(/ex : 60/i), { target: { value: "60" } });
  fireEvent.click(screen.getByRole("button", { name: /valider l'établissement/i }));

  // The fix: submitStructure() succeeding calls onValidated(), which
  // reloads RestaurantSimulator's own progression.ready and moves the
  // player straight to the Menu tab instead of leaving them stranded.
  await waitFor(() => expect(submitStructure).toHaveBeenCalled());
  await waitFor(() => expect(reload).toHaveBeenCalled());
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("menu"));
});

test("submitStructure() alone never touches RestaurantSimulator's own state (documents why the explicit reload() wiring was the fix)", async () => {
  const reload = jest.fn();
  useRestaurantSimulator.mockReturnValue({
    progression: baseProgression(),
    setDifficulty: jest.fn(),
    loading: false,
    error: null,
    reload,
  });

  const submitStructure = jest.fn().mockResolvedValue({ valid: false, errors: [{ field: "name", message: "Le nom de l'établissement est obligatoire." }] });
  useRestaurant.mockReturnValue({
    restaurantState: { structure: { name: "", concept: "", location: "", capacity: 0 }, progression: { ready: false } },
    loading: false,
    error: null,
    loadRestaurantState: jest.fn().mockResolvedValue(undefined),
    submitStructure,
  });

  render(<RestaurantSimulator />, { wrapper: MemoryRouter });
  fireEvent.click(screen.getByRole("button", { name: /valider l'établissement/i }));

  // A rejected submission (invalid: false) must never trigger reload()/
  // navigate() -- onValidated() only fires once the structure was
  // actually persisted.
  await waitFor(() => expect(submitStructure).toHaveBeenCalled());
  expect(reload).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
});
