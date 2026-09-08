import { render, screen } from "@testing-library/react";
import DashboardReplaySummary from "./DashboardReplaySummary";

test("shows a placeholder before any day has been played", () => {
  render(<DashboardReplaySummary replaySummary={null} />);
  expect(screen.getByText(/aucune journée jouée/i)).toBeInTheDocument();
});

test("shows the last cycle's kpis, events and decisions", () => {
  render(
    <DashboardReplaySummary
      replaySummary={{
        cycleIndex: 0,
        kpis: { profit: 300, score: 62, hotelRevenue: 500, restaurantRevenue: 200 },
        events: [{ message: "Inspection sanitaire" }],
        decisions: { marketingBudget: 2000 },
      }}
    />
  );
  expect(screen.getByText(/300 €/)).toBeInTheDocument();
  expect(screen.getByText(/62/)).toBeInTheDocument();
  expect(screen.getByText(/Inspection sanitaire/)).toBeInTheDocument();
  expect(screen.getByText(/marketingBudget: 2000/)).toBeInTheDocument();
});

test("shows 'aucun'/'aucune' when there are no events or decisions", () => {
  render(<DashboardReplaySummary replaySummary={{ cycleIndex: 0, kpis: { profit: 0, score: 0 }, events: [], decisions: {} }} />);
  expect(screen.getByText(/événements : aucun/i)).toBeInTheDocument();
  expect(screen.getByText(/décisions du jour : aucune/i)).toBeInTheDocument();
});
