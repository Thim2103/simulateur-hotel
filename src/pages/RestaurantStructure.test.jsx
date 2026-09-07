import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RestaurantStructure from "./RestaurantStructure";
import { useRestaurant } from "../hooks/useRestaurant";

jest.mock("../hooks/useRestaurant");

function baseHook(overrides = {}) {
  return {
    restaurantState: { structure: { name: "", concept: "", location: "", capacity: 0 }, progression: { ready: false } },
    loading: false,
    error: null,
    loadRestaurantState: jest.fn().mockResolvedValue(undefined),
    submitStructure: jest.fn(),
    ...overrides,
  };
}

test("loads the restaurant state on mount", () => {
  const loadRestaurantState = jest.fn().mockResolvedValue(undefined);
  useRestaurant.mockReturnValue(baseHook({ loadRestaurantState }));
  render(<RestaurantStructure />);
  expect(loadRestaurantState).toHaveBeenCalledTimes(1);
});

test("submitting an incomplete form shows field errors and does not report success", async () => {
  const submitStructure = jest.fn().mockResolvedValue({ valid: false, errors: [{ field: "name", message: "Le nom de l'établissement est obligatoire." }] });
  useRestaurant.mockReturnValue(baseHook({ submitStructure }));
  render(<RestaurantStructure />);

  fireEvent.click(screen.getByRole("button", { name: /valider l'établissement/i }));

  await waitFor(() => expect(submitStructure).toHaveBeenCalled());
  expect(await screen.findByText(/le nom de l'établissement est obligatoire/i)).toBeInTheDocument();
  expect(screen.queryByText(/établissement validé/i)).not.toBeInTheDocument();
});

test("submitting a complete form calls submitStructure with the form fields and shows a success banner", async () => {
  const submitStructure = jest.fn().mockResolvedValue({ valid: true, errors: [] });
  useRestaurant.mockReturnValue(baseHook({ submitStructure }));
  render(<RestaurantStructure />);

  fireEvent.change(screen.getByPlaceholderText(/le central/i), { target: { value: "Bistro du Port" } });
  fireEvent.change(screen.getByPlaceholderText(/bistro moderne/i), { target: { value: "Fruits de mer" } });
  fireEvent.change(screen.getByPlaceholderText(/lyon, france/i), { target: { value: "Marseille" } });
  fireEvent.change(screen.getByPlaceholderText(/60/i), { target: { value: "50" } });
  fireEvent.click(screen.getByRole("button", { name: /valider l'établissement/i }));

  await waitFor(() => expect(submitStructure).toHaveBeenCalledWith(expect.objectContaining({ name: "Bistro du Port", concept: "Fruits de mer", location: "Marseille", capacity: 50 })));
  expect(await screen.findByText(/établissement validé/i)).toBeInTheDocument();
});

test("shows a 'validated' badge and an update button once already ready", () => {
  useRestaurant.mockReturnValue(
    baseHook({ restaurantState: { structure: { name: "Bistro du Port", concept: "Fruits de mer", location: "Marseille", capacity: 50 }, progression: { ready: true } } })
  );
  render(<RestaurantStructure />);
  expect(screen.getByText(/établissement validé/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /mettre à jour l'établissement/i })).toBeInTheDocument();
});

test("shows the load error when it occurs", () => {
  useRestaurant.mockReturnValue(baseHook({ error: new Error("Supabase indisponible") }));
  render(<RestaurantStructure />);
  expect(screen.getByText(/supabase indisponible/i)).toBeInTheDocument();
});
