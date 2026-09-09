import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RmDisplacement from "./RmDisplacement";
import { useCareerContext } from "../context/CareerContext";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useRmAdvancedEngine");

function rmAdvancedState(overrides = {}) {
  return {
    displacement: {
      bySegment: { ota: 300, groups: 150 },
      totalLoss: 450,
      worstDates: [{ date: "2026-09-16", loss: 300 }],
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
  render(<RmDisplacement />, { wrapper: MemoryRouter });
  expect(screen.getByText(/démarrez votre carrière/i)).toBeInTheDocument();
});

test("shows total loss KPI and worst dates", () => {
  useRmAdvancedEngine.mockReturnValue(rmHook({ rmAdvancedState: rmAdvancedState() }));
  render(<RmDisplacement />, { wrapper: MemoryRouter });

  expect(screen.getByText("450 €")).toBeInTheDocument();
  expect(screen.getByText("2026-09-16")).toBeInTheDocument();
});

test("clicking 'Optimiser le mix segments' calls applyRmAdvancedAction", () => {
  const applyRmAdvancedAction = jest.fn().mockResolvedValue(null);
  useRmAdvancedEngine.mockReturnValue(rmHook({ rmAdvancedState: rmAdvancedState(), applyRmAdvancedAction }));
  render(<RmDisplacement />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /optimiser le mix segments/i }));
  expect(applyRmAdvancedAction).toHaveBeenCalledWith("optimiser-mix-segments");
});
