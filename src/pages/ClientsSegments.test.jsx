import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClientsSegments from "./ClientsSegments";
import { useCareerContext } from "../context/CareerContext";
import { useClientsEngine } from "../hooks/useClientsEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useClientsEngine");

function careerState(overrides = {}) {
  return { day: 3, status: "active", hotel: {}, missions: [], objectives: [], ...overrides };
}

function clientsState(overrides = {}) {
  return {
    satisfaction: 68,
    loyalty: 55,
    segments: { business: 30, leisure: 45, famille: 15, premium: 10 },
    replayLog: { entries: [{ cycleIndex: 0, satisfaction: 68, loyalty: 55, avgRating: 3.8 }] },
    ...overrides,
  };
}

function clientsHook(overrides = {}) {
  return {
    clientsState: null, isRunning: false, error: null,
    loadClientsState: jest.fn().mockResolvedValue(null),
    applyClientsAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the clients state on mount", () => {
  const loadClientsState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue({ careerState: careerState(), isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook({ loadClientsState }));
  render(<ClientsSegments />, { wrapper: MemoryRouter });
  expect(loadClientsState).toHaveBeenCalled();
});

test("prompts to start career when none exists", () => {
  useCareerContext.mockReturnValue({ careerState: null, isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook());
  render(<ClientsSegments />, { wrapper: MemoryRouter });
  expect(screen.getByText(/démarrez votre carrière/i)).toBeInTheDocument();
});

test("shows segment shares when loaded", () => {
  useCareerContext.mockReturnValue({ careerState: careerState(), isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook({ clientsState: clientsState() }));
  render(<ClientsSegments />, { wrapper: MemoryRouter });

  expect(screen.getByText("30%")).toBeInTheDocument(); // business
  expect(screen.getByText("45%")).toBeInTheDocument(); // leisure (dominant)
});

test("shows dominant segment concentration warning when > 65%", () => {
  useCareerContext.mockReturnValue({ careerState: careerState(), isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook({ clientsState: clientsState({ segments: { business: 10, leisure: 70, famille: 12, premium: 8 } }) }));
  render(<ClientsSegments />, { wrapper: MemoryRouter });

  expect(screen.getByText(/oncentration/i)).toBeInTheDocument();
});
