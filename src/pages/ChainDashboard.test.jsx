import { render, screen, fireEvent } from "@testing-library/react";
import ChainDashboard from "./ChainDashboard";
import { useChain } from "../hooks/useChain";

jest.mock("../hooks/useChain");

function hotel(overrides = {}) {
  return {
    id: "a",
    name: "Riviera Palace",
    city: "Nice",
    hotelState: { structure: { roomCount: 60 } },
    ...overrides,
  };
}

function sampleReport(overrides = {}) {
  return {
    date: "2026-09-10",
    hotels: [{ id: "a", name: "Riviera Palace", city: "Nice", dailyReport: { profit: 250 } }],
    finance: { totalRevenue: 1000, totalExpenses: 600, totalProfit: 400 },
    rm: { consolidatedForecast: { next7: 700, next30: 3000, next90: 9000 }, consolidatedPickup: {}, recommendedADR: 180 },
    progression: { chainLevel: { level: 2, title: "Gérant confirmé" }, chainXP: 120, chainReputation: 70, achievements: [{ id: "chain_builder", name: "Bâtisseur de chaîne", description: "..." }] },
    events: { regionalEvents: [{ id: "r1", city: "Nice", message: "Un festival anime la région." }], globalEvents: [] },
    ...overrides,
  };
}

function baseHookState(overrides = {}) {
  return {
    chainState: { hotels: [], activeHotelId: null },
    activeHotel: null,
    chainReport: null,
    addHotel: jest.fn(),
    switchHotel: jest.fn(),
    runChainCycle: jest.fn().mockResolvedValue(sampleReport()),
    isRunning: false,
    error: null,
    ...overrides,
  };
}

test("shows an empty state and disables the cycle button when the chain has no hotels", () => {
  useChain.mockReturnValue(baseHookState());
  render(<ChainDashboard />);

  expect(screen.getByText(/ajoutez un premier hôtel/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /jour suivant/i })).toBeDisabled();
});

test("lists the chain's hotels and highlights the active one", () => {
  useChain.mockReturnValue(baseHookState({ chainState: { hotels: [hotel()], activeHotelId: "a" }, activeHotel: hotel() }));
  render(<ChainDashboard />);

  expect(screen.getByText("Riviera Palace")).toBeInTheDocument();
  expect(screen.getByText("Actif")).toBeInTheDocument();
});

test("calling addHotel via the form fields", () => {
  const addHotel = jest.fn();
  useChain.mockReturnValue(baseHookState({ addHotel }));
  render(<ChainDashboard />);

  fireEvent.change(screen.getByPlaceholderText(/riviera palace/i), { target: { value: "Alpine Lodge" } });
  fireEvent.change(screen.getByPlaceholderText(/nice/i), { target: { value: "Chamonix" } });
  fireEvent.click(screen.getByRole("button", { name: /ajouter un hôtel/i }));

  expect(addHotel).toHaveBeenCalledWith(expect.objectContaining({ name: "Alpine Lodge", city: "Chamonix" }));
});

test("switching to a non-active hotel calls switchHotel with its id", () => {
  const switchHotel = jest.fn();
  const hotels = [hotel({ id: "a" }), hotel({ id: "b", name: "Second Hotel", city: "Lyon" })];
  useChain.mockReturnValue(baseHookState({ chainState: { hotels, activeHotelId: "a" }, activeHotel: hotels[0], switchHotel }));
  render(<ChainDashboard />);

  fireEvent.click(screen.getByRole("button", { name: /basculer sur cet hôtel/i }));
  expect(switchHotel).toHaveBeenCalledWith("b");
});

test("displays consolidated finance, RM, events and progression once a report is available", () => {
  useChain.mockReturnValue(
    baseHookState({ chainState: { hotels: [hotel()], activeHotelId: "a" }, activeHotel: hotel(), chainReport: sampleReport() })
  );
  render(<ChainDashboard />);

  expect(screen.getByText("1 000 €")).toBeInTheDocument();
  expect(screen.getByText("180 €")).toBeInTheDocument();
  expect(screen.getByText(/festival anime la région/i)).toBeInTheDocument();
  expect(screen.getByText("2 · Gérant confirmé")).toBeInTheDocument();
  expect(screen.getByText(/bâtisseur de chaîne/i)).toBeInTheDocument();
});

test("shows an error banner when the chain cycle fails", () => {
  useChain.mockReturnValue(baseHookState({ error: new Error("Session Supabase non authentifiee.") }));
  render(<ChainDashboard />);
  expect(screen.getByText(/impossible de calculer le cycle de la chaîne/i)).toBeInTheDocument();
});
