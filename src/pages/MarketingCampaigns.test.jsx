import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MarketingCampaigns from "./MarketingCampaigns";
import { useMarketingEngine } from "../hooks/useMarketingEngine";
import { useCareerContext } from "../context/CareerContext";

jest.mock("../hooks/useMarketingEngine");
jest.mock("../context/CareerContext");

function campaignsFixture() {
  return [
    { id: 1, name: "Séjour signature", objective: "Acquisition", status: "active", budget: 3000, conversion: 7, roi: 2.1, generatedRevenue: 6300, netResult: 3300 },
    { id: 2, name: "Fidélité VIP", objective: "Fidélisation", status: "paused", budget: 1000, conversion: 4, roi: 0.8, generatedRevenue: 800, netResult: -200 },
  ];
}

function marketingHook(overrides = {}) {
  return {
    marketingState: null,
    isRunning: false,
    error: null,
    loadMarketingState: jest.fn().mockResolvedValue(null),
    getCampaigns: jest.fn(() => []),
    ...overrides,
  };
}

beforeEach(() => {
  useCareerContext.mockReturnValue({ applyHotelAdjustment: jest.fn().mockResolvedValue(null) });
});

test("loads the marketing state on mount", () => {
  const loadMarketingState = jest.fn().mockResolvedValue(null);
  useMarketingEngine.mockReturnValue(marketingHook({ loadMarketingState }));
  render(<MarketingCampaigns />, { wrapper: MemoryRouter });
  expect(loadMarketingState).toHaveBeenCalled();
});

test("shows a placeholder before any marketing cycle exists", () => {
  useMarketingEngine.mockReturnValue(marketingHook());
  render(<MarketingCampaigns />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune donnée marketing/i)).toBeInTheDocument();
});

test("shows a placeholder when there are no campaigns yet", () => {
  useMarketingEngine.mockReturnValue(marketingHook({ marketingState: {} }));
  render(<MarketingCampaigns />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune campagne pour le moment/i)).toBeInTheDocument();
});

test("shows each campaign's performance and ROI", () => {
  useMarketingEngine.mockReturnValue(marketingHook({ marketingState: {}, getCampaigns: () => campaignsFixture() }));
  render(<MarketingCampaigns />, { wrapper: MemoryRouter });

  expect(screen.getByText("Séjour signature")).toBeInTheDocument();
  expect(screen.getByText(/ROI : 2.1x/)).toBeInTheDocument();
  expect(screen.getByText("Fidélité VIP")).toBeInTheDocument();
});

test("clicking 'Supprimer' on a campaign applies the update through Career", async () => {
  const applyHotelAdjustment = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue({ applyHotelAdjustment });
  useMarketingEngine.mockReturnValue(marketingHook({ marketingState: {}, getCampaigns: () => campaignsFixture() }));
  render(<MarketingCampaigns />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getAllByRole("button", { name: /supprimer/i })[0]);
  expect(applyHotelAdjustment).toHaveBeenCalled();
});
