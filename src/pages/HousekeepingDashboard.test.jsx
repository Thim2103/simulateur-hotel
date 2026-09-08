import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HousekeepingDashboard from "./HousekeepingDashboard";
import { useCareerContext } from "../context/CareerContext";
import { useHousekeepingEngine } from "../hooks/useHousekeepingEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useHousekeepingEngine");

function careerState(overrides = {}) {
  return {
    day: 3,
    status: "active",
    hotel: { hotelState: {}, restaurantState: {} },
    missions: [{ id: "spotless-rooms", title: "Chambres impeccables", description: "Atteindre 4,5/5 de satisfaction client grâce à un housekeeping irréprochable.", status: "accepted" }],
    objectives: [{ id: "clean-rooms-satisfaction", label: "Maintenir 4/5 de satisfaction grâce à des chambres bien tenues", achieved: true }],
    rewardsInbox: [],
    ...overrides,
  };
}

function housekeepingState(overrides = {}) {
  return {
    workload: { roomsToClean: 6, priorities: { arrivals: 2, departures: 4, stayovers: 3 } },
    cleaningTime: { totalMinutes: 240, minutesPerRoom: 30 },
    productivity: 68,
    overload: 72,
    understaffing: { understaffed: false, shortfall: 0 },
    quality: 74,
    housekeeperCount: 3,
    cost: 7800,
    diagnostics: [{ type: "opportunity", severity: "low", message: "Équipe housekeeping performante." }],
    replayLog: { entries: [{ cycleIndex: 0, roomsToClean: 6, overload: 72, quality: 74, productivity: 68 }] },
    forecast: { scenarios: { realiste: { days: [{ day: 1, quality: 74 }] } } },
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

function hkHook(overrides = {}) {
  return {
    housekeepingState: null,
    isRunning: false,
    error: null,
    loadHousekeepingState: jest.fn().mockResolvedValue(null),
    applyHousekeepingAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the housekeeping state on mount", () => {
  const loadHousekeepingState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook());
  useHousekeepingEngine.mockReturnValue(hkHook({ loadHousekeepingState }));
  render(<HousekeepingDashboard />, { wrapper: MemoryRouter });
  expect(loadHousekeepingState).toHaveBeenCalled();
});

test("prompts to start a career when none exists yet", () => {
  useCareerContext.mockReturnValue(careerHook());
  useHousekeepingEngine.mockReturnValue(hkHook());
  render(<HousekeepingDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument();
});

test("shows the HK KPIs, priorities, diagnostics and career progression once loaded", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useHousekeepingEngine.mockReturnValue(hkHook({ housekeepingState: housekeepingState() }));
  render(<HousekeepingDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByText("6")).toBeInTheDocument(); // charge
  expect(screen.getByText("68/100")).toBeInTheDocument(); // productivity
  expect(screen.getByText("74/100")).toBeInTheDocument(); // quality
  expect(screen.getByText("Équipe housekeeping performante.")).toBeInTheDocument();
  expect(screen.getByText("Chambres impeccables")).toBeInTheDocument();
  expect(screen.getByText("Maintenir 4/5 de satisfaction grâce à des chambres bien tenues")).toBeInTheDocument();
});

test("clicking an HK action's 'Appliquer' calls applyHousekeepingAction with its id", () => {
  const applyHousekeepingAction = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useHousekeepingEngine.mockReturnValue(hkHook({ housekeepingState: housekeepingState(), applyHousekeepingAction }));
  render(<HousekeepingDashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getAllByRole("button", { name: /appliquer/i })[0]);
  expect(applyHousekeepingAction).toHaveBeenCalledWith("reorganiser-planning");
});

test("links to the forecast and full report pages", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useHousekeepingEngine.mockReturnValue(hkHook({ housekeepingState: housekeepingState() }));
  render(<HousekeepingDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByRole("link", { name: /prévisions/i })).toHaveAttribute("href", "/housekeeping/forecast");
  expect(screen.getByRole("link", { name: /^rapport$/i })).toHaveAttribute("href", "/housekeeping/report");
});
