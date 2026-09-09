import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RmCompression from "./RmCompression";
import { useCareerContext } from "../context/CareerContext";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useRmAdvancedEngine");

function rmAdvancedState(overrides = {}) {
  return {
    compression: {
      byDate: [{ date: "2026-09-16", occupancyRate: 95, occupiedRooms: 19, totalRooms: 20, level: "high" }],
      avgCompression: 95,
      highCompressionDates: ["2026-09-16"],
      lowOccupancyDates: ["2026-09-20"],
    },
    ...overrides,
  };
}

function rmHook(overrides = {}) {
  return {
    rmAdvancedState: null, isRunning: false, error: null,
    loadRmAdvancedState: jest.fn().mockResolvedValue(null),
    applyRmAdvancedAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

beforeEach(() => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
});

test("prompts to start a career when none exists yet", () => {
  useCareerContext.mockReturnValue({ careerState: null, isRunning: false, error: null });
  useRmAdvancedEngine.mockReturnValue(rmHook());
  render(<RmCompression />, { wrapper: MemoryRouter });
  expect(screen.getByText(/démarrez votre carrière/i)).toBeInTheDocument();
});

test("shows surbooking-risk and under-occupancy dates", () => {
  useRmAdvancedEngine.mockReturnValue(rmHook({ rmAdvancedState: rmAdvancedState() }));
  render(<RmCompression />, { wrapper: MemoryRouter });

  expect(screen.getByText("2026-09-16")).toBeInTheDocument();
  expect(screen.getByText("2026-09-20")).toBeInTheDocument();
  expect(screen.getByText("Risque surbooking")).toBeInTheDocument();
});

test("clicking 'Augmenter l'ADR' calls applyRmAdvancedAction", () => {
  const applyRmAdvancedAction = jest.fn().mockResolvedValue(null);
  useRmAdvancedEngine.mockReturnValue(rmHook({ rmAdvancedState: rmAdvancedState(), applyRmAdvancedAction }));
  render(<RmCompression />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /augmenter l'adr/i }));
  expect(applyRmAdvancedAction).toHaveBeenCalledWith("augmenter-adr");
});
