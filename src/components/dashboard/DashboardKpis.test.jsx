import { render, screen } from "@testing-library/react";
import DashboardKpis from "./DashboardKpis";

const kpis = { occupancyRate: 75, averagePrice: 120, adr: 135, revenueToday: 2500, profit: 300, satisfaction: 4.2, staffCount: 5, ebitda: 54000, staffMorale: 72, marketingRoi: 2.4, esgScore: 68 };

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

test("shows the EBITDA KPI (see the Refonte Finance request's Dashboard integration)", () => {
  render(<DashboardKpis kpis={kpis} viewMode="casual" />);
  expect(screen.getByText("EBITDA")).toBeInTheDocument();
  expect(screen.getByText("54 000 €")).toBeInTheDocument();
});

test("shows a placeholder dash when EBITDA isn't available yet", () => {
  render(<DashboardKpis kpis={{ ...kpis, ebitda: null }} viewMode="casual" />);
  expect(screen.getByText("EBITDA")).toBeInTheDocument();
});

test("shows the Moral RH KPI (see the Refonte RH request's Dashboard integration)", () => {
  render(<DashboardKpis kpis={kpis} viewMode="casual" />);
  expect(screen.getByText("Moral RH")).toBeInTheDocument();
  expect(screen.getByText("72/100")).toBeInTheDocument();
});

test("shows a placeholder dash when Moral RH isn't available yet", () => {
  render(<DashboardKpis kpis={{ ...kpis, staffMorale: null }} viewMode="casual" />);
  expect(screen.getByText("Moral RH")).toBeInTheDocument();
});

test("shows the ROI Marketing KPI (see the Refonte Marketing request's Dashboard integration)", () => {
  render(<DashboardKpis kpis={kpis} viewMode="casual" />);
  expect(screen.getByText("ROI Marketing")).toBeInTheDocument();
  expect(screen.getByText("2.4x")).toBeInTheDocument();
});

test("shows a placeholder dash when ROI Marketing isn't available yet", () => {
  render(<DashboardKpis kpis={{ ...kpis, marketingRoi: null }} viewMode="casual" />);
  expect(screen.getByText("ROI Marketing")).toBeInTheDocument();
});

test("shows the Score ESG KPI (see the Refonte ESG request's Dashboard integration)", () => {
  render(<DashboardKpis kpis={kpis} viewMode="casual" />);
  expect(screen.getByText("Score ESG")).toBeInTheDocument();
  expect(screen.getByText("68/100")).toBeInTheDocument();
});

test("shows a placeholder dash when Score ESG isn't available yet", () => {
  render(<DashboardKpis kpis={{ ...kpis, esgScore: null }} viewMode="casual" />);
  expect(screen.getByText("Score ESG")).toBeInTheDocument();
});
