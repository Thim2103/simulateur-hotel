import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RmAdvancedForecast from "./RmAdvancedForecast";
import { useCareerContext } from "../context/CareerContext";
import { useRmAdvancedEngine } from "../hooks/useRmAdvancedEngine";

jest.mock("../context/CareerContext");
jest.mock("../hooks/useRmAdvancedEngine");

// Chart.js needs a real canvas context, which jsdom doesn't provide; these
// tests only care about the surrounding text/DOM, not the rendered canvas.
jest.mock("react-chartjs-2", () => ({
  Line: () => <div data-testid="line-chart" />,
  Bar: () => <div data-testid="bar-chart" />,
  Pie: () => <div data-testid="pie-chart" />,
}));

function forecast() {
  return {
    horizonDays: 30,
    generatedAt: new Date().toISOString(),
    scenarios: {
      optimiste: { avgCompression: 72, avgDirectShare: 50, endCompression: 78, endDirectShare: 55, endNetAdr: 140, days: [{ day: 1, compression: 72, directShare: 50 }] },
      base: { avgCompression: 66, avgDirectShare: 42, endCompression: 68, endDirectShare: 42, endNetAdr: 120, days: [{ day: 1, compression: 68, directShare: 42 }] },
      pessimiste: { avgCompression: 58, avgDirectShare: 35, endCompression: 54, endDirectShare: 30, endNetAdr: 100, days: [{ day: 1, compression: 54, directShare: 30 }] },
    },
  };
}

function rmAdvancedState(overrides = {}) {
  return { compression: { avgCompression: 66 }, otaStrategy: { directShare: 42 }, forecast: forecast(), ...overrides };
}

function rmHook(overrides = {}) {
  return {
    rmAdvancedState: null, isRunning: false, error: null,
    loadRmAdvancedState: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the RM Advanced state on mount", () => {
  const loadRmAdvancedState = jest.fn().mockResolvedValue(null);
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRmAdvancedEngine.mockReturnValue(rmHook({ loadRmAdvancedState }));
  render(<RmAdvancedForecast />, { wrapper: MemoryRouter });
  expect(loadRmAdvancedState).toHaveBeenCalled();
});

test("prompts to play a cycle when no forecast yet", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRmAdvancedEngine.mockReturnValue(rmHook({ rmAdvancedState: rmAdvancedState({ forecast: null }) }));
  render(<RmAdvancedForecast />, { wrapper: MemoryRouter });
  expect(screen.getByText(/jouez un cycle/i)).toBeInTheDocument();
});

test("shows base scenario KPIs by default", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRmAdvancedEngine.mockReturnValue(rmHook({ rmAdvancedState: rmAdvancedState() }));
  render(<RmAdvancedForecast />, { wrapper: MemoryRouter });

  expect(screen.getByText("68%")).toBeInTheDocument(); // endCompression base
  expect(screen.getByText("66%")).toBeInTheDocument(); // avgCompression base
});

test("switching to optimiste tab shows optimiste KPIs", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 3 }, isRunning: false, error: null });
  useRmAdvancedEngine.mockReturnValue(rmHook({ rmAdvancedState: rmAdvancedState() }));
  render(<RmAdvancedForecast />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("tab", { name: /optimiste/i }));
  expect(screen.getByText("78%")).toBeInTheDocument(); // endCompression optimiste
});
