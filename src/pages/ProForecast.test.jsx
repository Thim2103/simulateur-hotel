import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProForecast from "./ProForecast";
import { useProEngine } from "../hooks/useProEngine";

jest.mock("../hooks/useProEngine");

// Chart.js needs a real canvas context, which jsdom doesn't provide; these
// tests only care about the surrounding text/DOM, not the rendered canvas.
jest.mock("react-chartjs-2", () => ({
  Line: () => <div data-testid="line-chart" />,
  Bar: () => <div data-testid="bar-chart" />,
  Pie: () => <div data-testid="pie-chart" />,
}));

function forecast() {
  return {
    horizonMonths: 24,
    generatedAt: new Date().toISOString(),
    scenarios: {
      optimiste: { avgScore: 72, endScore: 78, endEbitdaMargin: 0.15, months: [{ month: 1, score: 72, ebitdaMargin: 0.1 }] },
      realiste: { avgScore: 64, endScore: 66, endEbitdaMargin: 0.08, months: [{ month: 1, score: 64, ebitdaMargin: 0.05 }] },
      pessimiste: { avgScore: 55, endScore: 48, endEbitdaMargin: -0.02, months: [{ month: 1, score: 55, ebitdaMargin: -0.01 }] },
    },
  };
}

function proHook(overrides = {}) {
  return {
    proState: null, isRunning: false, error: null,
    loadProState: jest.fn().mockResolvedValue(null),
    getProForecast: jest.fn().mockReturnValue(null),
    ...overrides,
  };
}

test("loads the Pro state on mount", () => {
  const loadProState = jest.fn().mockResolvedValue(null);
  useProEngine.mockReturnValue(proHook({ loadProState }));
  render(<ProForecast />, { wrapper: MemoryRouter });
  expect(loadProState).toHaveBeenCalled();
});

test("prompts to play a month when no forecast yet", () => {
  useProEngine.mockReturnValue(proHook());
  render(<ProForecast />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune prévision/i)).toBeInTheDocument();
});

test("shows réaliste scenario KPIs by default", () => {
  useProEngine.mockReturnValue(proHook({ proState: { proId: "pro-1" }, getProForecast: jest.fn().mockReturnValue(forecast()) }));
  render(<ProForecast />, { wrapper: MemoryRouter });

  expect(screen.getByText("64/100")).toBeInTheDocument(); // avgScore réaliste
  expect(screen.getByText("66/100")).toBeInTheDocument(); // endScore réaliste
});

test("switching to optimiste tab shows optimiste KPIs", () => {
  useProEngine.mockReturnValue(proHook({ proState: { proId: "pro-1" }, getProForecast: jest.fn().mockReturnValue(forecast()) }));
  render(<ProForecast />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("tab", { name: /optimiste/i }));
  expect(screen.getByText("78/100")).toBeInTheDocument(); // endScore optimiste
});
