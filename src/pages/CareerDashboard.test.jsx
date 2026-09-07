import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CareerDashboard from "./CareerDashboard";
import { useCareerContext } from "../context/CareerContext";

jest.mock("../context/CareerContext");

function careerState(overrides = {}) {
  return {
    status: "active",
    day: 3,
    missions: [{ id: "occupancy-80", title: "Salle comble", status: "accepted" }],
    objectives: [{ id: "first-profit", achieved: true }, { id: "reputation-60", achieved: false }],
    storyline: { currentEventId: null, history: [] },
    skills: { leadership: { points: 5, level: 0 }, negotiation: { points: 0, level: 0 }, management: { points: 0, level: 0 } },
    rewardsInbox: [],
    lastAnalysis: null,
    ...overrides,
  };
}

function baseHook(overrides = {}) {
  return {
    careerState: null,
    isRunning: false,
    error: null,
    loadCareerState: jest.fn().mockResolvedValue(null),
    startCareer: jest.fn().mockResolvedValue(careerState()),
    ...overrides,
  };
}

test("loads the career on mount", () => {
  const loadCareerState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue(baseHook({ loadCareerState }));
  render(<CareerDashboard />, { wrapper: MemoryRouter });
  expect(loadCareerState).toHaveBeenCalled();
});

test("prompts to start a career when none exists yet", () => {
  useCareerContext.mockReturnValue(baseHook());
  render(<CareerDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("button", { name: /démarrer ma carrière/i })).toBeInTheDocument();
});

test("starting a career calls startCareer", () => {
  const startCareer = jest.fn().mockResolvedValue(careerState());
  useCareerContext.mockReturnValue(baseHook({ startCareer }));
  render(<CareerDashboard />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /démarrer ma carrière/i }));
  expect(startCareer).toHaveBeenCalledWith("moi");
});

test("shows progression, accepted missions and skills once a career is active", () => {
  useCareerContext.mockReturnValue(baseHook({ careerState: careerState() }));
  render(<CareerDashboard />, { wrapper: MemoryRouter });

  expect(screen.getByText(/jour 3/i)).toBeInTheDocument();
  expect(screen.getByText("Salle comble")).toBeInTheDocument();
  expect(screen.getByText("Leadership")).toBeInTheDocument();
});

test("shows a banner linking to the story page when a narrative event is pending", () => {
  useCareerContext.mockReturnValue(baseHook({ careerState: careerState({ storyline: { currentEventId: "staff-conflict", history: [] } }) }));
  render(<CareerDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /le consulter/i })).toHaveAttribute("href", "/career/story");
});

test("shows analytics insights when a last analysis is available", () => {
  useCareerContext.mockReturnValue(
    baseHook({ careerState: careerState({ lastAnalysis: { recommendations: [{ text: "Corriger en priorité : x", severity: "high" }] } }) })
  );
  render(<CareerDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByText(/corriger en priorité/i)).toBeInTheDocument();
});
