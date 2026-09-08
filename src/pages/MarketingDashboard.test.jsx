import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MarketingDashboard from "./MarketingDashboard";
import { useCareerContext } from "../context/CareerContext";
import { useMarketingEngine } from "../hooks/useMarketingEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useMarketingEngine");

function careerState(overrides = {}) {
  return {
    day: 3,
    status: "active",
    hotel: { hotelState: {}, restaurantState: {} },
    missions: [{ id: "brand-reputation-75", title: "Image de marque", description: "Atteindre 75 de réputation.", status: "accepted" }],
    objectives: [{ id: "marketing-revenue-day", label: "Générer 2 500 € de revenu net grâce au marketing", achieved: true }],
    rewardsInbox: [],
    ...overrides,
  };
}

function marketingState(overrides = {}) {
  return {
    budget: { channel: 4000, campaign: 3000, total: 7000 },
    roi: { campaignsAvgRoi: 2.1, overallRoi: 2.1, generatedRevenue: 14700 },
    conversion: { totalReach: 200, estimatedLeads: 120, conversionRate: 15 },
    reputation: 72,
    positioningTier: "upscale",
    segments: { counts: { business: 3, leisure: 5, famille: 2, premium: 1 } },
    channels: [{ id: "ota", name: "OTA", enabled: true, budget: 2200, reach: 68 }],
    campaigns: [{ id: 1, name: "Été", status: "active" }],
    diagnostics: [{ type: "opportunity", severity: "low", message: "Marketing performant." }],
    replayLog: { entries: [{ cycleIndex: 0, roi: { overallRoi: 2.1 }, conversion: { conversionRate: 15 }, reputation: 72 }] },
    forecast: { scenarios: { realiste: { days: [{ day: 1, roi: 2.1 }] } } },
    ...overrides,
  };
}

function careerHook(overrides = {}) {
  return {
    careerState: null,
    isRunning: false,
    error: null,
    startCareer: jest.fn().mockResolvedValue(careerState()),
    ...overrides,
  };
}

function marketingHook(overrides = {}) {
  return {
    marketingState: null,
    isRunning: false,
    error: null,
    loadMarketingState: jest.fn().mockResolvedValue(null),
    applyMarketingAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the marketing state on mount", () => {
  const loadMarketingState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook());
  useMarketingEngine.mockReturnValue(marketingHook({ loadMarketingState }));
  render(<MarketingDashboard />, { wrapper: MemoryRouter });
  expect(loadMarketingState).toHaveBeenCalled();
});

test("prompts to start a career when none exists yet", () => {
  useCareerContext.mockReturnValue(careerHook());
  useMarketingEngine.mockReturnValue(marketingHook());
  render(<MarketingDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument();
});

test("shows the marketing KPIs, diagnostics and career progression once loaded", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useMarketingEngine.mockReturnValue(marketingHook({ marketingState: marketingState() }));
  render(<MarketingDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByText("7 000 €")).toBeInTheDocument(); // budget
  expect(screen.getByText("2.1x")).toBeInTheDocument(); // roi
  expect(screen.getByText("72/100")).toBeInTheDocument(); // reputation
  expect(screen.getByText("Marketing performant.")).toBeInTheDocument();
  expect(screen.getByText("Image de marque")).toBeInTheDocument();
  expect(screen.getByText("Générer 2 500 € de revenu net grâce au marketing")).toBeInTheDocument();
});

test("clicking a marketing action's 'Appliquer' calls applyMarketingAction with its id", () => {
  const applyMarketingAction = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useMarketingEngine.mockReturnValue(marketingHook({ marketingState: marketingState(), applyMarketingAction }));
  render(<MarketingDashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getAllByRole("button", { name: /appliquer/i })[0]);
  expect(applyMarketingAction).toHaveBeenCalledWith("lancer-campagne");
});

test("links to campaigns, channels, forecast and full report pages", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useMarketingEngine.mockReturnValue(marketingHook({ marketingState: marketingState() }));
  render(<MarketingDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByRole("link", { name: /campagnes/i })).toHaveAttribute("href", "/marketing/campaigns");
  expect(screen.getByRole("link", { name: /canaux/i })).toHaveAttribute("href", "/marketing/channels");
  expect(screen.getByRole("link", { name: /prévisions/i })).toHaveAttribute("href", "/marketing/forecast");
  expect(screen.getByRole("link", { name: /rapport/i })).toHaveAttribute("href", "/marketing/report");
});
