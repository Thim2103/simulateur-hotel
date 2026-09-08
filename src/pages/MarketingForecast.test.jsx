import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MarketingForecast from "./MarketingForecast";
import { useMarketingEngine } from "../hooks/useMarketingEngine";

jest.mock("../hooks/useMarketingEngine");

function scenario({ avgRoi, endReputation, avgConversion = 12 }) {
  return {
    days: Array.from({ length: 30 }, (_, index) => ({ day: index + 1, roi: avgRoi, conversion: avgConversion, reputation: endReputation })),
    avgRoi,
    avgConversion,
    endReputation,
  };
}

function forecast() {
  return {
    horizonDays: 30,
    scenarios: {
      optimiste: scenario({ avgRoi: 3, endReputation: 80 }),
      realiste: scenario({ avgRoi: 2, endReputation: 65 }),
      pessimiste: scenario({ avgRoi: 1, endReputation: 45 }),
    },
  };
}

function marketingHook(overrides = {}) {
  return {
    marketingState: null,
    isRunning: false,
    error: null,
    loadMarketingState: jest.fn().mockResolvedValue(null),
    getMarketingForecast: jest.fn(() => null),
    ...overrides,
  };
}

test("loads the marketing state on mount", () => {
  const loadMarketingState = jest.fn().mockResolvedValue(null);
  useMarketingEngine.mockReturnValue(marketingHook({ loadMarketingState }));
  render(<MarketingForecast />, { wrapper: MemoryRouter });
  expect(loadMarketingState).toHaveBeenCalled();
});

test("shows a placeholder before any forecast exists", () => {
  useMarketingEngine.mockReturnValue(marketingHook());
  render(<MarketingForecast />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune prévision/i)).toBeInTheDocument();
});

test("shows the 'réaliste' scenario by default", () => {
  useMarketingEngine.mockReturnValue(marketingHook({ marketingState: {}, getMarketingForecast: () => forecast() }));
  render(<MarketingForecast />, { wrapper: MemoryRouter });

  expect(screen.getByRole("tab", { name: "Réaliste" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("2x")).toBeInTheDocument(); // avgRoi for réaliste
});

test("switching scenarios updates the KPIs shown", () => {
  useMarketingEngine.mockReturnValue(marketingHook({ marketingState: {}, getMarketingForecast: () => forecast() }));
  render(<MarketingForecast />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("tab", { name: "Optimiste" }));

  expect(screen.getByRole("tab", { name: "Optimiste" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("3x")).toBeInTheDocument();
});

test("shows a scenario comparison across the three scenarios", () => {
  useMarketingEngine.mockReturnValue(marketingHook({ marketingState: {}, getMarketingForecast: () => forecast() }));
  render(<MarketingForecast />, { wrapper: MemoryRouter });

  expect(screen.getByText(/roi moyen : 3x/i)).toBeInTheDocument();
  expect(screen.getByText(/roi moyen : 2x/i)).toBeInTheDocument();
  expect(screen.getByText(/roi moyen : 1x/i)).toBeInTheDocument();
});
