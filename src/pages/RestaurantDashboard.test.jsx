import { render, screen, fireEvent } from "@testing-library/react";
import RestaurantDashboard from "./RestaurantDashboard";
import { useRestaurant } from "../hooks/useRestaurant";

jest.mock("../hooks/useRestaurant");

function restaurantState(overrides = {}) {
  return {
    structure: { name: "Le Central", capacity: 40 },
    finance: { months: ["Jan", "Fev"], revenue: [1000, 1200] },
    menu: [{ name: "Burger", category: "Plat", price: 15, cost: 6, sales: 10 }],
    staff: [{ id: 1, name: "Ada" }],
    ...overrides,
  };
}

function report(overrides = {}) {
  return {
    date: "2026-09-10",
    demand: 70,
    rushHour: "18:00-21:00",
    complaints: 1,
    maintenanceRisk: 20,
    customerSatisfaction: 4.2,
    finance: { avgTicket: 15, grossMargin: 90, estimatedProfit: 40 },
    staff: { productivity: 80, headcount: 1 },
    menu: { popularity: 75 },
    ...overrides,
  };
}

function baseHook(overrides = {}) {
  return {
    restaurantState: restaurantState(),
    restaurantReport: null,
    loading: false,
    error: null,
    loadRestaurantState: jest.fn().mockResolvedValue(restaurantState()),
    runRestaurantCycle: jest.fn(),
    ...overrides,
  };
}

test("shows a loading state before the first load resolves", () => {
  useRestaurant.mockReturnValue(baseHook({ restaurantState: null, loading: true }));
  render(<RestaurantDashboard />);
  expect(screen.getByRole("status")).toBeInTheDocument();
});

test("shows an error banner when the load fails with no cached state", () => {
  useRestaurant.mockReturnValue(baseHook({ restaurantState: null, error: new Error("Supabase indisponible") }));
  render(<RestaurantDashboard />);
  expect(screen.getByText(/impossible de charger les données restaurant/i)).toBeInTheDocument();
});

test("prompts to recalculate before any report exists", () => {
  useRestaurant.mockReturnValue(baseHook());
  render(<RestaurantDashboard />);
  expect(screen.getByText(/cliquez sur « recalculer l'aperçu »/i)).toBeInTheDocument();
});

test("clicking recalculate calls runRestaurantCycle", () => {
  const runRestaurantCycle = jest.fn();
  useRestaurant.mockReturnValue(baseHook({ runRestaurantCycle }));
  render(<RestaurantDashboard />);
  fireEvent.click(screen.getByRole("button", { name: /recalculer l'aperçu/i }));
  expect(runRestaurantCycle).toHaveBeenCalled();
});

test("displays the real restaurantReport once available, not mocked KPIs", () => {
  useRestaurant.mockReturnValue(baseHook({ restaurantReport: report() }));
  render(<RestaurantDashboard />);
  expect(screen.getByText("70%")).toBeInTheDocument();
  expect(screen.getByText("18:00-21:00")).toBeInTheDocument();
  expect(screen.getByText("4.20/5")).toBeInTheDocument();
});
