import { render, screen } from "@testing-library/react";
import RMDashboard from "./RMDashboard";
import { useRM } from "../hooks/useRM";

jest.mock("../hooks/useRM");

// Chart.js needs a real canvas context, which jsdom doesn't provide; these
// tests only care about the surrounding text/DOM, not the rendered canvas.
jest.mock("react-chartjs-2", () => ({
  Line: () => <div data-testid="line-chart" />,
  Bar: () => <div data-testid="bar-chart" />,
  Pie: () => <div data-testid="pie-chart" />,
}));

function sampleReport(overrides = {}) {
  return {
    date: "2026-09-10",
    forecast: { next7: 700, next30: 3000, next90: 9000, daily30: [{ date: "2026-09-11", value: 100 }] },
    pickup: { daily: { "2026-09-01": 2 }, bySegment: {}, byChannel: {} },
    pricing: { recommendedADR: 150, minPrice: 100, maxPrice: 220, eventAdjustment: 0.05, weatherAdjustment: -0.03, occupancyAdjustment: 0.08 },
    segmentation: { mix: { leisure: 3, corporate: 1, ota: 0, groups: 0 }, adrBySegment: { leisure: 140 }, pickupBySegment: { leisure: 2 } },
    recommendations: [{ id: "boost_demand", priority: "high", message: "Occupation faible : envisager une promotion." }],
    ...overrides,
  };
}

test("shows a loading state before any report is available", () => {
  useRM.mockReturnValue({ runRM: jest.fn().mockResolvedValue(sampleReport()), rmReport: null, isRunning: true, error: null });
  render(<RMDashboard />);
  expect(screen.getByText(/calcul du rapport rm en cours/i)).toBeInTheDocument();
});

test("shows an error banner when the engine fails", () => {
  useRM.mockReturnValue({ runRM: jest.fn().mockResolvedValue(null), rmReport: null, isRunning: false, error: new Error("Session Supabase non authentifiee.") });
  render(<RMDashboard />);
  expect(screen.getByText(/impossible de calculer le rapport rm/i)).toBeInTheDocument();
});

test("displays the forecast, pricing, and recommendations once a report is available", () => {
  useRM.mockReturnValue({ runRM: jest.fn().mockResolvedValue(sampleReport()), rmReport: sampleReport(), isRunning: false, error: null });
  render(<RMDashboard />);

  expect(screen.getByText("700 €")).toBeInTheDocument(); // next7
  expect(screen.getByText("150 €")).toBeInTheDocument(); // recommendedADR
  expect(screen.getByText(/envisager une promotion/i)).toBeInTheDocument();
});

test("calls runRM() once on mount", () => {
  const runRM = jest.fn().mockResolvedValue(sampleReport());
  useRM.mockReturnValue({ runRM, rmReport: null, isRunning: false, error: null });
  render(<RMDashboard />);
  expect(runRM).toHaveBeenCalledTimes(1);
});
