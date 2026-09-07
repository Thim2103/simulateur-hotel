import { render, screen, fireEvent } from "@testing-library/react";
import CareerMissions from "./CareerMissions";
import { useCareerContext } from "../context/CareerContext";

jest.mock("../context/CareerContext");

function baseHook(overrides = {}) {
  return {
    careerState: {
      missions: [
        { id: "occupancy-80", title: "Salle comble", description: "desc", status: "available", auto: true },
        { id: "mini-scenario-pricing", title: "Cas pratique", description: "desc", status: "accepted", auto: false },
      ],
    },
    isRunning: false,
    error: null,
    acceptMission: jest.fn().mockResolvedValue({}),
    completeMission: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

test("shows a prompt to start a career when none exists", () => {
  useCareerContext.mockReturnValue(baseHook({ careerState: null }));
  render(<CareerMissions />);
  expect(screen.getByText(/démarrez d'abord votre carrière/i)).toBeInTheDocument();
});

test("shows every mission with its status", () => {
  useCareerContext.mockReturnValue(baseHook());
  render(<CareerMissions />);
  expect(screen.getByText("Salle comble")).toBeInTheDocument();
  expect(screen.getByText("Cas pratique")).toBeInTheDocument();
});

test("accepting an available mission calls acceptMission", () => {
  const acceptMission = jest.fn().mockResolvedValue({});
  useCareerContext.mockReturnValue(baseHook({ acceptMission }));
  render(<CareerMissions />);

  fireEvent.click(screen.getByRole("button", { name: /accepter/i }));
  expect(acceptMission).toHaveBeenCalledWith("occupancy-80");
});

test("completing a non-auto accepted mission calls completeMission", () => {
  const completeMission = jest.fn().mockResolvedValue({});
  useCareerContext.mockReturnValue(baseHook({ completeMission }));
  render(<CareerMissions />);

  fireEvent.click(screen.getByRole("button", { name: /terminer/i }));
  expect(completeMission).toHaveBeenCalledWith("mini-scenario-pricing");
});
