import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClientsDashboard from "./ClientsDashboard";
import { useCareerContext } from "../context/CareerContext";
import { useClientsEngine } from "../hooks/useClientsEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useClientsEngine");

function careerState(overrides = {}) {
  return {
    day: 5,
    status: "active",
    hotel: { hotelState: {}, restaurantState: {} },
    missions: [{ id: "guest-satisfaction", title: "Satisfaction client 4/5", description: "Maintenir la satisfaction clients.", status: "accepted" }],
    objectives: [{ id: "loyalty-50", label: "Fidélité > 50/100", achieved: false }],
    rewardsInbox: [],
    ...overrides,
  };
}

function clientsState(overrides = {}) {
  return {
    satisfaction: 72,
    loyalty: 61,
    reviews: { avgRating: 4.0, count: 22, positive: 78, negative: 9, trend: "stable" },
    complaints: [],
    segments: { business: 28, leisure: 42, famille: 18, premium: 12 },
    behaviors: { avgSpend: 195, returnRate: 49, preferredSegment: "leisure" },
    diagnostics: [{ type: "opportunity", severity: "low", message: "Bonne satisfaction client." }],
    replayLog: { entries: [{ cycleIndex: 0, satisfaction: 72, loyalty: 61, avgRating: 4.0 }] },
    forecast: { scenarios: { realiste: { days: [{ day: 1, satisfaction: 72 }] } } },
    ...overrides,
  };
}

function careerHook(overrides = {}) {
  return { careerState: null, isRunning: false, error: null, startCareer: jest.fn().mockResolvedValue(careerState()), ...overrides };
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
  useCareerContext.mockReturnValue(careerHook());
  useClientsEngine.mockReturnValue(clientsHook({ loadClientsState }));
  render(<ClientsDashboard />, { wrapper: MemoryRouter });
  expect(loadClientsState).toHaveBeenCalled();
});

test("prompts to start a career when none exists yet", () => {
  useCareerContext.mockReturnValue(careerHook());
  useClientsEngine.mockReturnValue(clientsHook());
  render(<ClientsDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument();
});

test("shows KPIs, segments, diagnostics and career progression once loaded", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useClientsEngine.mockReturnValue(clientsHook({ clientsState: clientsState() }));
  render(<ClientsDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByText("72/100")).toBeInTheDocument(); // satisfaction
  expect(screen.getByText("61/100")).toBeInTheDocument(); // loyalty
  expect(screen.getByText("4.0/5")).toBeInTheDocument(); // rating
  expect(screen.getByText("Bonne satisfaction client.")).toBeInTheDocument();
  expect(screen.getByText("Satisfaction client 4/5")).toBeInTheDocument();
  expect(screen.getByText("Fidélité > 50/100")).toBeInTheDocument();
});

test("clicking an action's 'Appliquer' calls applyClientsAction", () => {
  const applyClientsAction = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useClientsEngine.mockReturnValue(clientsHook({ clientsState: clientsState(), applyClientsAction }));
  render(<ClientsDashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getAllByRole("button", { name: /appliquer/i })[0]);
  expect(applyClientsAction).toHaveBeenCalledWith("ameliorer-accueil");
});

test("links to segments, reviews, forecast and report pages", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useClientsEngine.mockReturnValue(clientsHook({ clientsState: clientsState() }));
  render(<ClientsDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByRole("link", { name: /segments/i })).toHaveAttribute("href", "/clients/segments");
  expect(screen.getByRole("link", { name: /^avis$/i })).toHaveAttribute("href", "/clients/reviews");
  expect(screen.getByRole("link", { name: /prévisions/i })).toHaveAttribute("href", "/clients/forecast");
  expect(screen.getByRole("link", { name: /^rapport$/i })).toHaveAttribute("href", "/clients/report");
});
