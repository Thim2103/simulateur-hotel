import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EsgDashboard from "./EsgDashboard";
import { useCareerContext } from "../context/CareerContext";
import { useEsgEngine } from "../hooks/useEsgEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useEsgEngine");

function careerState(overrides = {}) {
  return {
    day: 3,
    status: "active",
    hotel: { hotelState: {}, restaurantState: {} },
    missions: [{ id: "sustainability-champion", title: "Établissement exemplaire", description: "Atteindre 80 de réputation grâce à une démarche ESG exemplaire.", status: "accepted" }],
    objectives: [{ id: "esg-reputation-70", label: "Atteindre 70 de réputation grâce à une démarche ESG", achieved: true }],
    rewardsInbox: [],
    ...overrides,
  };
}

function esgState(overrides = {}) {
  return {
    energy: 320,
    water: 12.5,
    waste: 45,
    co2: 210,
    score: 62,
    certifications: [{ id: "green-key", name: "Green Key", obtained: true, progress: 100 }, { id: "earthcheck", name: "EarthCheck", obtained: false, progress: 40 }],
    diagnostics: [{ type: "opportunity", severity: "low", message: "Démarche ESG solide." }],
    replayLog: { entries: [{ cycleIndex: 0, energy: 320, water: 12.5, waste: 45, co2: 210, score: 62 }] },
    forecast: { scenarios: { realiste: { days: [{ day: 1, score: 62 }] } } },
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

function esgHook(overrides = {}) {
  return {
    esgState: null,
    isRunning: false,
    error: null,
    loadEsgState: jest.fn().mockResolvedValue(null),
    applyEsgAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the ESG state on mount", () => {
  const loadEsgState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook());
  useEsgEngine.mockReturnValue(esgHook({ loadEsgState }));
  render(<EsgDashboard />, { wrapper: MemoryRouter });
  expect(loadEsgState).toHaveBeenCalled();
});

test("prompts to start a career when none exists yet", () => {
  useCareerContext.mockReturnValue(careerHook());
  useEsgEngine.mockReturnValue(esgHook());
  render(<EsgDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument();
});

test("shows the ESG KPIs, diagnostics and career progression once loaded", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useEsgEngine.mockReturnValue(esgHook({ esgState: esgState() }));
  render(<EsgDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByText("320 kWh")).toBeInTheDocument(); // energy
  expect(screen.getByText("62/100")).toBeInTheDocument(); // score
  expect(screen.getByText("1/2")).toBeInTheDocument(); // certifications obtained/total
  expect(screen.getByText("Démarche ESG solide.")).toBeInTheDocument();
  expect(screen.getByText("Établissement exemplaire")).toBeInTheDocument();
  expect(screen.getByText("Atteindre 70 de réputation grâce à une démarche ESG")).toBeInTheDocument();
});

test("clicking an ESG action's 'Appliquer' calls applyEsgAction with its id", () => {
  const applyEsgAction = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useEsgEngine.mockReturnValue(esgHook({ esgState: esgState(), applyEsgAction }));
  render(<EsgDashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getAllByRole("button", { name: /appliquer/i })[0]);
  expect(applyEsgAction).toHaveBeenCalledWith("reduire-energie");
});

test("links to certifications, forecast and full report pages", () => {
  useCareerContext.mockReturnValue(careerHook({ careerState: careerState() }));
  useEsgEngine.mockReturnValue(esgHook({ esgState: esgState() }));
  render(<EsgDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByRole("link", { name: /certifications/i })).toHaveAttribute("href", "/esg/certifications");
  expect(screen.getByRole("link", { name: /prévisions/i })).toHaveAttribute("href", "/esg/forecast");
  expect(screen.getByRole("link", { name: /^rapport$/i })).toHaveAttribute("href", "/esg/report");
});
