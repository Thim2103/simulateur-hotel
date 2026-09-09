import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClientsReviews from "./ClientsReviews";
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
    reviews: { avgRating: 3.9, count: 18, positive: 76, negative: 11, trend: "improving" },
    complaints: [{ type: "chambre", severity: "medium", resolved: false }],
    replayLog: { entries: [{ cycleIndex: 0, satisfaction: 68, avgRating: 3.9 }] },
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
  render(<ClientsReviews />, { wrapper: MemoryRouter });
  expect(loadClientsState).toHaveBeenCalled();
});

test("prompts to start career when none exists", () => {
  useCareerContext.mockReturnValue({ careerState: null, isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook());
  render(<ClientsReviews />, { wrapper: MemoryRouter });
  expect(screen.getByText(/démarrez votre carrière/i)).toBeInTheDocument();
});

test("shows review KPIs and trend badge", () => {
  useCareerContext.mockReturnValue({ careerState: careerState(), isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook({ clientsState: clientsState() }));
  render(<ClientsReviews />, { wrapper: MemoryRouter });

  expect(screen.getByText("3.9/5")).toBeInTheDocument();
  expect(screen.getByText("76%")).toBeInTheDocument(); // positifs
  expect(screen.getByText(/en hausse/i)).toBeInTheDocument(); // trend improving
});

test("shows complaints list", () => {
  useCareerContext.mockReturnValue({ careerState: careerState(), isRunning: false, error: null });
  useClientsEngine.mockReturnValue(clientsHook({ clientsState: clientsState() }));
  render(<ClientsReviews />, { wrapper: MemoryRouter });

  expect(screen.getByText(/chambre/i)).toBeInTheDocument();
});
