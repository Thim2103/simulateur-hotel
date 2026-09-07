import { render, screen, fireEvent } from "@testing-library/react";
import CareerNextDay from "./CareerNextDay";
import { useCareerContext } from "../context/CareerContext";

jest.mock("../context/CareerContext");

function dayOutcome(overrides = {}) {
  return {
    state: { day: 4 },
    report: {
      adjustedProfit: 850,
      dayScore: 72,
      progression: { reputation: 65 },
      completedMissions: [{ id: "occupancy-80", title: "Salle comble" }],
      achievedObjectives: [{ id: "first-profit", label: "Réaliser un premier jour rentable" }],
      dailyReport: { events: [{ message: "Un client VIP est arrivé." }] },
      newStoryEvent: null,
    },
    ...overrides,
  };
}

function baseHook(overrides = {}) {
  return {
    careerState: { day: 3 },
    isRunning: false,
    error: null,
    nextDay: jest.fn().mockResolvedValue(dayOutcome()),
    ...overrides,
  };
}

test("shows a prompt to start a career when none exists", () => {
  useCareerContext.mockReturnValue(baseHook({ careerState: null }));
  render(<CareerNextDay />);
  expect(screen.getByText(/démarrez d'abord votre carrière/i)).toBeInTheDocument();
});

test("prompts to advance before any day has been played this session", () => {
  useCareerContext.mockReturnValue(baseHook());
  render(<CareerNextDay />);
  expect(screen.getByText(/cliquez sur « jour suivant »/i)).toBeInTheDocument();
});

test("clicking 'Jour suivant' calls nextDay and shows the resulting summary/consequences", async () => {
  const nextDay = jest.fn().mockResolvedValue(dayOutcome());
  useCareerContext.mockReturnValue(baseHook({ nextDay }));
  render(<CareerNextDay />);

  fireEvent.click(screen.getByRole("button", { name: /jour suivant/i }));
  expect(nextDay).toHaveBeenCalled();

  expect(await screen.findByText("850 €")).toBeInTheDocument();
  expect(screen.getByText("72")).toBeInTheDocument();
  expect(screen.getByText(/salle comble/i)).toBeInTheDocument();
  expect(screen.getByText(/réaliser un premier jour rentable/i)).toBeInTheDocument();
  expect(screen.getByText(/un client vip est arrivé/i)).toBeInTheDocument();
});
