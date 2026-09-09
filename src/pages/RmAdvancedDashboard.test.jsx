import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RmAdvancedDashboard from "./RmAdvancedDashboard";
import { useCareerContext } from "../context/CareerContext";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useRmAdvancedEngine");

function careerState(overrides = {}) {
  return { day: 5, status: "active", hotel: { hotelState: {}, rooms: [], reservations: [] }, missions: [], objectives: [], rewardsInbox: [], ...overrides };
}

function rmAdvancedState(overrides = {}) {
  return {
    compression: { byDate: [], avgCompression: 68, highCompressionDates: [], lowOccupancyDates: [] },
    displacement: { bySegment: {}, totalLoss: 120, worstDates: [] },
    pickupCurves: { curve: [{ leadTimeDays: 30, bookedPct: 20 }, { leadTimeDays: 0, bookedPct: 100 }], momentum: 15 },
    otaStrategy: { otaShare: 35, directShare: 45, channels: { direct: { adr: 130 }, ota: { adr: 110 } }, netAdrByChannel: { direct: 130, ota: 90 } },
    specialPricing: { events: [], corporateRate: 100 },
    diagnostics: [{ type: "opportunity", severity: "low", message: "Bonne performance RM." }],
    forecast: { scenarios: { base: { days: [{ day: 1, compression: 68 }] } } },
    ...overrides,
  };
}

function careerHook(overrides = {}) {
  return { careerState: null, isRunning: false, error: null, startCareer: jest.fn().mockResolvedValue(careerState()), ...overrides };
}

function rmHook(overrides = {}) {
  return {
    rmAdvancedState: null, isRunning: false, error: null,
    loadRmAdvancedState: jest.fn().mockResolvedValue(null),
    applyRmAdvancedAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the RM Advanced state on mount", () => {
  const loadRmAdvancedState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook());
  useRmAdvancedEngine.mockReturnValue(rmHook({ loadRmAdvancedState }));
  render(<RmAdvancedDashboard />, { wrapper: MemoryRouter });
  expect(loadRmAdvancedState).toHaveBeenCalled();
});

test("prompts to start a career when none exists yet", () => {
  useCareerContext.mockReturnValue(careerHook());
  useRmAdvancedEngine.mockReturnValue(rmHook());
  render(<RmAdvancedDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument();
});

test("shows KPIs and diagnostics once loaded", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useRmAdvancedEngine.mockReturnValue(rmHook({ rmAdvancedState: rmAdvancedState() }));
  render(<RmAdvancedDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByText("68%")).toBeInTheDocument(); // compression
  expect(screen.getByText("120 €")).toBeInTheDocument(); // displacement
  expect(screen.getByText("Bonne performance RM.")).toBeInTheDocument();
});

test("clicking an action's 'Appliquer' calls applyRmAdvancedAction", () => {
  const applyRmAdvancedAction = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useRmAdvancedEngine.mockReturnValue(rmHook({ rmAdvancedState: rmAdvancedState(), applyRmAdvancedAction }));
  render(<RmAdvancedDashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getAllByRole("button", { name: /appliquer/i })[0]);
  expect(applyRmAdvancedAction).toHaveBeenCalledWith("augmenter-adr");
});

test("links to compression, displacement, pickup, forecast and report pages", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useRmAdvancedEngine.mockReturnValue(rmHook({ rmAdvancedState: rmAdvancedState() }));
  render(<RmAdvancedDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByRole("link", { name: /compression/i })).toHaveAttribute("href", "/rm-advanced/compression");
  expect(screen.getByRole("link", { name: /displacement/i })).toHaveAttribute("href", "/rm-advanced/displacement");
  expect(screen.getByRole("link", { name: /pick-up/i })).toHaveAttribute("href", "/rm-advanced/pickup");
  expect(screen.getByRole("link", { name: /forecast/i })).toHaveAttribute("href", "/rm-advanced/forecast");
  expect(screen.getByRole("link", { name: /^rapport$/i })).toHaveAttribute("href", "/rm-advanced/report");
});
