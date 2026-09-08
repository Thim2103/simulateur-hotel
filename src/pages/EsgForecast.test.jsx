import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EsgForecast from "./EsgForecast";
import { useEsgEngine } from "../hooks/useEsgEngine";

jest.mock("../hooks/useEsgEngine");

function scenario({ avgEnergy, endCo2, endScore, avgCo2 = 150 }) {
  return {
    days: Array.from({ length: 30 }, (_, index) => ({ day: index + 1, energy: avgEnergy, co2: endCo2, score: endScore })),
    avgEnergy,
    avgCo2,
    endCo2,
    endScore,
  };
}

function forecast() {
  return {
    horizonDays: 30,
    scenarios: {
      optimiste: scenario({ avgEnergy: 250, endCo2: 100, endScore: 80 }),
      realiste: scenario({ avgEnergy: 320, endCo2: 200, endScore: 60 }),
      pessimiste: scenario({ avgEnergy: 400, endCo2: 320, endScore: 40 }),
    },
  };
}

function esgHook(overrides = {}) {
  return {
    esgState: null,
    isRunning: false,
    error: null,
    loadEsgState: jest.fn().mockResolvedValue(null),
    getEsgForecast: jest.fn(() => null),
    ...overrides,
  };
}

test("loads the ESG state on mount", () => {
  const loadEsgState = jest.fn().mockResolvedValue(null);
  useEsgEngine.mockReturnValue(esgHook({ loadEsgState }));
  render(<EsgForecast />, { wrapper: MemoryRouter });
  expect(loadEsgState).toHaveBeenCalled();
});

test("shows a placeholder before any forecast exists", () => {
  useEsgEngine.mockReturnValue(esgHook());
  render(<EsgForecast />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune prévision/i)).toBeInTheDocument();
});

test("shows the 'réaliste' scenario by default", () => {
  useEsgEngine.mockReturnValue(esgHook({ esgState: {}, getEsgForecast: () => forecast() }));
  render(<EsgForecast />, { wrapper: MemoryRouter });

  expect(screen.getByRole("tab", { name: "Réaliste" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("60/100")).toBeInTheDocument(); // endScore for réaliste
});

test("switching scenarios updates the KPIs shown", () => {
  useEsgEngine.mockReturnValue(esgHook({ esgState: {}, getEsgForecast: () => forecast() }));
  render(<EsgForecast />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("tab", { name: "Pessimiste" }));

  expect(screen.getByRole("tab", { name: "Pessimiste" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("40/100")).toBeInTheDocument();
});

test("shows a scenario comparison across the three scenarios", () => {
  useEsgEngine.mockReturnValue(esgHook({ esgState: {}, getEsgForecast: () => forecast() }));
  render(<EsgForecast />, { wrapper: MemoryRouter });

  expect(screen.getByText(/score final : 80\/100/i)).toBeInTheDocument();
  expect(screen.getByText(/score final : 60\/100/i)).toBeInTheDocument();
  expect(screen.getByText(/score final : 40\/100/i)).toBeInTheDocument();
});
