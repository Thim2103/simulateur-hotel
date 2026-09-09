import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClientsForecast from "./ClientsForecast";
import { useCareerContext } from "../context/CareerContext";
import { useClientsEngine } from "../hooks/useClientsEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useClientsEngine");

// Chart.js needs a real canvas context, which jsdom doesn't provide; these
// tests only care about the surrounding text/DOM, not the rendered canvas.
jest.mock("react-chartjs-2", () => ({
  Line: () => <div data-testid="line-chart" />,
  Bar: () => <div data-testid="bar-chart" />,
  Pie: () => <div data-testid="pie-chart" />,
}));

function forecast() {
  return {
    horizonDays: 30,
    generatedAt: new Date().toISOString(),
    scenarios: {
      optimiste: { avgSatisfaction: 76, avgLoyalty: 68, endSatisfaction: 80, endLoyalty: 72, endRating: 4.3, days: [{ day: 1, satisfaction: 76, loyalty: 68, avgRating: 4.3, returnRate: 55 }] },
      realiste: { avgSatisfaction: 67, avgLoyalty: 60, endSatisfaction: 68, endLoyalty: 60, endRating: 3.9, days: [{ day: 1, satisfaction: 68, loyalty: 60, avgRating: 3.9, returnRate: 48 }] },
      pessimiste: { avgSatisfaction: 58, avgLoyalty: 50, endSatisfaction: 55, endLoyalty: 46, endRating: 3.4, days: [{ day: 1, satisfaction: 55, loyalty: 46, avgRating: 3.4, returnRate: 38 }] },
    },
  };
}

function clientsState(overrides = {}) {
  return {
    satisfaction: 68,
    loyalty: 60,
    reviews: { avgRating: 3.9 },
    behaviors: { returnRate: 48 },
    forecast: forecast(),
    ...overrides,
  };
}

function clientsHook(overrides = {}) {
  return {
    clientsState: null, isRunning: false, error: null,
    loadClientsState: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the clients state on mount", () => {
  const loadClientsState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook({ loadClientsState }));
  render(<ClientsForecast />, { wrapper: MemoryRouter });
  expect(loadClientsState).toHaveBeenCalled();
});

test("prompts to play a cycle when no forecast yet", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook({ clientsState: clientsState({ forecast: null }) }));
  render(<ClientsForecast />, { wrapper: MemoryRouter });
  expect(screen.getByText(/jouez un cycle/i)).toBeInTheDocument();
});

test("shows réaliste scenario KPIs by default", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook({ clientsState: clientsState() }));
  render(<ClientsForecast />, { wrapper: MemoryRouter });

  // avgSatisfaction=67, endSatisfaction=68 → only "68/100" present for endSatisfaction
  expect(screen.getByText("68/100")).toBeInTheDocument(); // endSatisfaction réaliste
  expect(screen.getByText("67/100")).toBeInTheDocument(); // avgSatisfaction réaliste
  expect(screen.getByText("3.9/5")).toBeInTheDocument(); // endRating réaliste
});

test("switching to optimiste tab shows optimiste KPIs", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook({ clientsState: clientsState() }));
  render(<ClientsForecast />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("tab", { name: /optimiste/i }));
  expect(screen.getByText("80/100")).toBeInTheDocument(); // endSatisfaction optimiste
});
