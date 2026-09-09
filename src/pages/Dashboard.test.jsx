import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { useCareerContext } from "../context/CareerContext";
import { useDashboard } from "../hooks/useDashboard";
import { useTfeEngine } from "../hooks/useTfeEngine";
import { useClientsEngine } from "../hooks/useClientsEngine";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useDashboard");
jest.mock("../hooks/useTfeEngine");
jest.mock("../hooks/useClientsEngine");
jest.mock("../hooks/useRmAdvancedEngine");

function careerState(overrides = {}) {
  return {
    status: "active",
    day: 3,
    missions: [],
    objectives: [],
    storyline: { currentEventId: null, history: [] },
    skills: { leadership: { points: 0, level: 0 } },
    rewardsInbox: [],
    lastAnalysis: null,
    ...overrides,
  };
}

function dashboardState(overrides = {}) {
  return {
    viewMode: "casual",
    kpis: { occupancyRate: 80, averagePrice: 120, adr: 130, revenueToday: 3000, profit: 400, satisfaction: 4.1, staffCount: 4, date: "2026-09-10" },
    notifications: { problems: [], alerts: [], opportunities: [] },
    insights: { hasInsights: false, diagnostics: [], recommendations: [] },
    quickActions: [{ id: "increase-prices", category: "pricing", label: "Augmenter les prix de 5 %", description: "…" }],
    replaySummary: null,
    careerSummary: { day: 3, status: "active", acceptedMissions: [], completedMissionsCount: 0, achievedObjectivesCount: 1, totalObjectives: 2, pendingRewardsCount: 0, skills: { leadership: { points: 0, level: 0 } } },
    metadata: {},
    lastUpdated: "2026-09-10T12:00:00Z",
    ...overrides,
  };
}

function careerHook(overrides = {}) {
  return {
    careerState: null,
    isRunning: false,
    error: null,
    startCareer: jest.fn().mockResolvedValue(careerState()),
    nextDay: jest.fn().mockResolvedValue({ state: careerState({ day: 4 }) }),
    ...overrides,
  };
}

function dashboardHook(overrides = {}) {
  return {
    dashboardState: null,
    isRunning: false,
    error: null,
    isGuest: false,
    loadDashboardState: jest.fn().mockResolvedValue(null),
    setViewMode: jest.fn().mockResolvedValue(null),
    applyQuickAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

// Dashboard also reads any in-progress TFE Solo run, the Clients
// satisfaction score and the RM Advanced OTA-vs-direct mix purely to
// surface them as KPIs -- no test here varies them, so default stubs
// prevent the real hooks (with their real guest-mode repository calls)
// from leaking into every test.
beforeEach(() => {
  useTfeEngine.mockReturnValue({ tfeState: null, loadTfeState: jest.fn().mockResolvedValue(null) });
  useClientsEngine.mockReturnValue({ clientsState: null, loadClientsState: jest.fn().mockResolvedValue(null) });
  useRmAdvancedEngine.mockReturnValue({ rmAdvancedState: null, loadRmAdvancedState: jest.fn().mockResolvedValue(null) });
});

test("loads the dashboard state on mount", () => {
  const loadDashboardState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook());
  useDashboard.mockReturnValue(dashboardHook({ loadDashboardState }));
  render(<Dashboard />, { wrapper: MemoryRouter });
  expect(loadDashboardState).toHaveBeenCalled();
});

test("prompts to start a career when none exists yet", () => {
  useCareerContext.mockReturnValue(careerHook());
  useDashboard.mockReturnValue(dashboardHook());
  render(<Dashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument();
});

test("shows the header, kpis, notifications, quick actions once a career is active", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useDashboard.mockReturnValue(dashboardHook({ dashboardState: dashboardState() }));
  render(<Dashboard />, { wrapper: MemoryRouter });

  expect(screen.getByText(/mon hôtel/i)).toBeInTheDocument();
  expect(screen.getByText(/jour 3/i)).toBeInTheDocument();
  expect(screen.getByText("Prix moyen")).toBeInTheDocument();
  expect(screen.getByText(/aucun problème détecté/i)).toBeInTheDocument();
  expect(screen.getByText("Augmenter les prix de 5 %")).toBeInTheDocument();
});

test("clicking 'Jouer la journée' calls nextDay and reloads the dashboard state with its fresh result", async () => {
  const freshState = careerState({ day: 4 });
  const nextDay = jest.fn().mockResolvedValue({ state: freshState });
  const loadDashboardState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState(), nextDay }));
  useDashboard.mockReturnValue(dashboardHook({ dashboardState: dashboardState(), loadDashboardState }));
  render(<Dashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /jouer la journée/i }));

  expect(nextDay).toHaveBeenCalled();
  // Passes nextDay()'s own returned state explicitly, not a stale
  // careerState read off context (see useDashboard.js's
  // loadDashboardState() docstring).
  await waitFor(() => expect(loadDashboardState).toHaveBeenCalledWith(freshState));
});

test("switching to expert mode calls setViewMode", () => {
  const setViewMode = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useDashboard.mockReturnValue(dashboardHook({ dashboardState: dashboardState(), setViewMode }));
  render(<Dashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: "Expert" }));
  expect(setViewMode).toHaveBeenCalledWith("expert");
});

test("clicking a quick action's 'Appliquer' calls applyQuickAction with its id", () => {
  const applyQuickAction = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useDashboard.mockReturnValue(dashboardHook({ dashboardState: dashboardState(), applyQuickAction }));
  render(<Dashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /appliquer/i }));
  expect(applyQuickAction).toHaveBeenCalledWith("increase-prices");
});

test("shows a banner linking to the story page when a narrative event is pending", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState({ storyline: { currentEventId: "staff-conflict", history: [] } }) }));
  useDashboard.mockReturnValue(dashboardHook({ dashboardState: dashboardState() }));
  render(<Dashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /le consulter/i })).toHaveAttribute("href", "/career/story");
});
