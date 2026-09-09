import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RmPickup from "./RmPickup";
import { useCareerContext } from "../context/CareerContext";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useRmAdvancedEngine");

function rmAdvancedState(overrides = {}) {
  return {
    pickupCurves: {
      curve: [
        { leadTimeDays: 30, bookedPct: 20 },
        { leadTimeDays: 7, bookedPct: 60 },
        { leadTimeDays: 0, bookedPct: 100 },
      ],
      momentum: 25,
    },
    ...overrides,
  };
}

function rmHook(overrides = {}) {
  return {
    rmAdvancedState: null, isRunning: false, error: null,
    loadRmAdvancedState: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

beforeEach(() => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
});

test("prompts to start a career when none exists yet", () => {
  useCareerContext.mockReturnValue({ careerState: null, isRunning: false, error: null });
  useRmAdvancedEngine.mockReturnValue(rmHook());
  render(<RmPickup />, { wrapper: MemoryRouter });
  expect(screen.getByText(/démarrez votre carrière/i)).toBeInTheDocument();
});

test("shows the booked-at-J0 KPI and momentum", () => {
  useRmAdvancedEngine.mockReturnValue(rmHook({ rmAdvancedState: rmAdvancedState() }));
  render(<RmPickup />, { wrapper: MemoryRouter });

  // "100%" appears both as the KPI value and in the pick-up table's J-0 row.
  expect(screen.getAllByText("100%").length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText("+25 pts")).toBeInTheDocument();
});

test("shows the pick-up table with one row per lead-time bucket", () => {
  useRmAdvancedEngine.mockReturnValue(rmHook({ rmAdvancedState: rmAdvancedState() }));
  render(<RmPickup />, { wrapper: MemoryRouter });

  expect(screen.getByText("J-30")).toBeInTheDocument();
  expect(screen.getByText("J-7")).toBeInTheDocument();
});
