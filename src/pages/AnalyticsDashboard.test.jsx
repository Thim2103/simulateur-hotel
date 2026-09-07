import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { useAnalytics } from "../hooks/useAnalytics";

jest.mock("../hooks/useAnalytics");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

function baseHook(overrides = {}) {
  return {
    isRunning: false,
    error: null,
    listAnalyses: jest.fn().mockResolvedValue([]),
    analyzeRun: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

test("loads the analysis roster on mount", () => {
  const listAnalyses = jest.fn().mockResolvedValue([]);
  useAnalytics.mockReturnValue(baseHook({ listAnalyses }));
  render(<AnalyticsDashboard />, { wrapper: MemoryRouter });
  expect(listAnalyses).toHaveBeenCalled();
});

test("shows an empty state when there are no analyses yet", () => {
  useAnalytics.mockReturnValue(baseHook());
  render(<AnalyticsDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune analyse pour le moment/i)).toBeInTheDocument();
});

test("submitting a run id calls analyzeRun", () => {
  const analyzeRun = jest.fn().mockResolvedValue({});
  useAnalytics.mockReturnValue(baseHook({ analyzeRun }));
  render(<AnalyticsDashboard />, { wrapper: MemoryRouter });

  fireEvent.change(screen.getByPlaceholderText(/academie-c1-g1/i), { target: { value: "academie-c1-g1" } });
  fireEvent.click(screen.getByRole("button", { name: /analyser/i }));

  expect(analyzeRun).toHaveBeenCalledWith("academie-c1-g1");
});

test("lists existing analyses with links to their run and report", async () => {
  useAnalytics.mockReturnValue(
    baseHook({ listAnalyses: jest.fn().mockResolvedValue([{ runId: "academie-c1-g1", ownerLabel: "Groupe A", source: "academie", diagnosticsCount: 2 }]) })
  );
  render(<AnalyticsDashboard />, { wrapper: MemoryRouter });

  expect(await screen.findByText("Groupe A")).toBeInTheDocument();
  expect(screen.getByText(/2 diagnostic/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /analyse/i })).toHaveAttribute("href", "/analytics/academie-c1-g1");
  expect(screen.getByRole("link", { name: /rapport/i })).toHaveAttribute("href", "/analytics/academie-c1-g1/report");
});

test("shows an error banner when a request fails", () => {
  useAnalytics.mockReturnValue(baseHook({ error: new Error("Supabase indisponible") }));
  render(<AnalyticsDashboard />, { wrapper: MemoryRouter });
  expect(screen.getByText(/supabase indisponible/i)).toBeInTheDocument();
});
