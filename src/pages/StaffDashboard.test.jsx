import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffDashboard from "./StaffDashboard";
import { useCareerContext } from "../context/CareerContext";
import { useStaffEngine } from "../hooks/useStaffEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useStaffEngine");

function careerState(overrides = {}) {
  return {
    day: 3,
    status: "active",
    hotel: { hotelState: {}, restaurantState: {} },
    missions: [{ id: "team-morale", title: "Équipe soudée", description: "Maintenir un bon moral d'équipe.", status: "accepted" }],
    objectives: [{ id: "low-turnover", label: "Maîtriser le turnover", achieved: true }],
    rewardsInbox: [],
    ...overrides,
  };
}

function staffState(overrides = {}) {
  return {
    headcount: { hotel: 10, restaurant: 6, total: 16 },
    morale: 72,
    productivity: 78,
    absenteeism: 8,
    overload: 85,
    housekeepingLoad: 90,
    serviceLoad: 70,
    turnover: { estimatedRate: 5, actualRateLastCycle: 0, departuresLast: 0 },
    payroll: { hotel: 38000, restaurant: 9800, total: 47800 },
    diagnostics: [{ type: "opportunity", severity: "low", message: "Équipe en bonne santé." }],
    replayLog: { entries: [{ cycleIndex: 0, morale: 72, productivity: 78, absenteeism: 8 }] },
    forecast: { scenarios: { realiste: { days: [{ day: 1, overload: 85 }] } } },
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

function staffHook(overrides = {}) {
  return {
    staffState: null,
    isRunning: false,
    error: null,
    loadStaffState: jest.fn().mockResolvedValue(null),
    applyStaffAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the staff state on mount", () => {
  const loadStaffState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook());
  useStaffEngine.mockReturnValue(staffHook({ loadStaffState }));
  render(<StaffDashboard />, { wrapper: MemoryRouter });
  expect(loadStaffState).toHaveBeenCalled();
});

test("prompts to start a career when none exists yet", () => {
  useCareerContext.mockReturnValue(careerHook());
  useStaffEngine.mockReturnValue(staffHook());
  render(<StaffDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument();
});

test("shows the HR KPIs, diagnostics and career progression once loaded", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useStaffEngine.mockReturnValue(staffHook({ staffState: staffState() }));
  render(<StaffDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByText("72/100")).toBeInTheDocument(); // moral
  expect(screen.getByText("78/100")).toBeInTheDocument(); // productivity
  expect(screen.getByText("8%")).toBeInTheDocument(); // absenteeism
  expect(screen.getByText("Équipe en bonne santé.")).toBeInTheDocument();
  expect(screen.getByText("Équipe soudée")).toBeInTheDocument();
  expect(screen.getByText("Maîtriser le turnover")).toBeInTheDocument();
});

test("clicking an HR action's 'Appliquer' calls applyStaffAction with its id", () => {
  const applyStaffAction = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useStaffEngine.mockReturnValue(staffHook({ staffState: staffState(), applyStaffAction }));
  render(<StaffDashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getAllByRole("button", { name: /appliquer/i })[0]);
  expect(applyStaffAction).toHaveBeenCalledWith("recruter");
});

test("links to the forecast and full report pages", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useStaffEngine.mockReturnValue(staffHook({ staffState: staffState() }));
  render(<StaffDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByRole("link", { name: /prévisions/i })).toHaveAttribute("href", "/staff/forecast");
  expect(screen.getByRole("link", { name: /rapport complet/i })).toHaveAttribute("href", "/staff/report");
});
