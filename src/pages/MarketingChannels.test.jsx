import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MarketingChannels from "./MarketingChannels";
import { useMarketingEngine } from "../hooks/useMarketingEngine";
import { useCareerContext } from "../context/CareerContext";

jest.mock("../hooks/useMarketingEngine");
jest.mock("../context/CareerContext");

function channelsFixture() {
  return [
    { id: "ota", name: "OTA", enabled: true, budget: 2200, reach: 68, reachShare: 60, costPerLead: 3, attributedRevenue: 5000, roi: 2.2 },
    { id: "direct", name: "Direct", enabled: false, budget: 900, reach: 47, reachShare: 40, costPerLead: 2, attributedRevenue: 3000, roi: 3.3 },
  ];
}

function marketingHook(overrides = {}) {
  return {
    marketingState: null,
    isRunning: false,
    error: null,
    loadMarketingState: jest.fn().mockResolvedValue(null),
    getChannels: jest.fn(() => []),
    ...overrides,
  };
}

beforeEach(() => {
  useCareerContext.mockReturnValue({ applyHotelAdjustment: jest.fn().mockResolvedValue(null) });
});

test("loads the marketing state on mount", () => {
  const loadMarketingState = jest.fn().mockResolvedValue(null);
  useMarketingEngine.mockReturnValue(marketingHook({ loadMarketingState }));
  render(<MarketingChannels />, { wrapper: MemoryRouter });
  expect(loadMarketingState).toHaveBeenCalled();
});

test("shows a placeholder before any marketing cycle exists", () => {
  useMarketingEngine.mockReturnValue(marketingHook());
  render(<MarketingChannels />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune donnée marketing/i)).toBeInTheDocument();
});

test("shows each channel's performance, conversion and cost", () => {
  useMarketingEngine.mockReturnValue(marketingHook({ marketingState: {}, getChannels: () => channelsFixture() }));
  render(<MarketingChannels />, { wrapper: MemoryRouter });

  expect(screen.getByText("OTA")).toBeInTheDocument();
  expect(screen.getByText(/ROI : 2.2x/)).toBeInTheDocument();
  expect(screen.getByText("Direct")).toBeInTheDocument();
  expect(screen.getByText("En pause")).toBeInTheDocument();
});

test("toggling a channel applies the update through Career", async () => {
  const applyHotelAdjustment = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue({ applyHotelAdjustment });
  useMarketingEngine.mockReturnValue(marketingHook({ marketingState: {}, getChannels: () => channelsFixture() }));
  render(<MarketingChannels />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getAllByRole("button", { name: /mettre en pause|activer/i })[0]);
  expect(applyHotelAdjustment).toHaveBeenCalled();
});
