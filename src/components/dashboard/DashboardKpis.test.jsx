import { render, screen } from "@testing-library/react";
import DashboardKpis from "./DashboardKpis";

const kpis = { occupancyRate: 75, averagePrice: 120, adr: 135, revenueToday: 2500, profit: 300, satisfaction: 4.2, staffCount: 5 };

test("shows loading placeholders when kpis is not ready yet", () => {
  render(<DashboardKpis kpis={null} viewMode="casual" />);
  expect(screen.getAllByLabelText(/chargement/i).length).toBeGreaterThan(0);
});

test("casual mode shows 'Prix moyen'", () => {
  render(<DashboardKpis kpis={kpis} viewMode="casual" />);
  expect(screen.getByText("Prix moyen")).toBeInTheDocument();
  expect(screen.getByText("120 €")).toBeInTheDocument();
});

test("expert mode shows 'ADR'", () => {
  render(<DashboardKpis kpis={kpis} viewMode="expert" />);
  expect(screen.getByText("ADR")).toBeInTheDocument();
  expect(screen.getByText("135 €")).toBeInTheDocument();
});

test("shows occupancy, revenue, satisfaction and staff", () => {
  render(<DashboardKpis kpis={kpis} viewMode="casual" />);
  expect(screen.getByText("75%")).toBeInTheDocument();
  expect(screen.getByText("2 500 €")).toBeInTheDocument();
  expect(screen.getByText("4.2/5")).toBeInTheDocument();
  expect(screen.getByText("5")).toBeInTheDocument();
});
