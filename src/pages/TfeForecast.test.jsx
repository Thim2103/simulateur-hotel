import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TfeForecast from "./TfeForecast";
import { useTfeEngine } from "../hooks/useTfeEngine";

jest.mock("../hooks/useTfeEngine");

function forecast() {
  return {
    horizonMonths: 36,
    scenarios: {
      optimiste: { avgScore: 74, endScore: 80, endEbitdaMargin: 0.18, months: [{ month: 1, score: 70, ebitdaMargin: 0.1 }] },
      realiste: { avgScore: 65, endScore: 68, endEbitdaMargin: 0.1, months: [{ month: 1, score: 60, ebitdaMargin: 0.05 }] },
      pessimiste: { avgScore: 52, endScore: 48, endEbitdaMargin: -0.05, months: [{ month: 1, score: 50, ebitdaMargin: -0.02 }] },
    },
  };
}

function tfeHook(overrides = {}) {
  return {
    tfeState: null,
    isRunning: false,
    error: null,
    loadTfeState: jest.fn().mockResolvedValue(null),
    getTfeForecast: jest.fn().mockReturnValue(null),
    ...overrides,
  };
}

test("loads the TFE state on mount", () => {
  const loadTfeState = jest.fn().mockResolvedValue(null);
  useTfeEngine.mockReturnValue(tfeHook({ loadTfeState }));
  render(<TfeForecast />, { wrapper: MemoryRouter });
  expect(loadTfeState).toHaveBeenCalled();
});

test("prompts to play at least a month when no forecast is available yet", () => {
  useTfeEngine.mockReturnValue(tfeHook());
  render(<TfeForecast />, { wrapper: MemoryRouter });
  expect(screen.getByText(/jouez au moins un mois/i)).toBeInTheDocument();
});

test("shows the réaliste scenario by default and switches to optimiste on click", () => {
  useTfeEngine.mockReturnValue(tfeHook({ tfeState: { status: "active" }, getTfeForecast: jest.fn().mockReturnValue(forecast()) }));
  render(<TfeForecast />, { wrapper: MemoryRouter });

  expect(screen.getByText("68/100")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "Optimiste" }));
  expect(screen.getByText("80/100")).toBeInTheDocument();
});
