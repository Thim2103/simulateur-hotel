import { render, screen } from "@testing-library/react";
import DashboardNotifications from "./DashboardNotifications";

test("shows the empty-state message for each bucket when there is nothing to report", () => {
  render(<DashboardNotifications notifications={{ problems: [], alerts: [], opportunities: [] }} />);
  expect(screen.getByText(/aucun problème détecté/i)).toBeInTheDocument();
  expect(screen.getByText(/aucune alerte/i)).toBeInTheDocument();
  expect(screen.getByText(/aucune opportunité/i)).toBeInTheDocument();
});

test("lists each notification's message under its bucket", () => {
  render(
    <DashboardNotifications
      notifications={{
        problems: [{ id: "p1", message: "Profit négatif." }],
        alerts: [{ id: "a1", message: "Occupation faible." }],
        opportunities: [{ id: "o1", message: "Augmentez les prix." }],
      }}
    />
  );
  expect(screen.getByText("Profit négatif.")).toBeInTheDocument();
  expect(screen.getByText("Occupation faible.")).toBeInTheDocument();
  expect(screen.getByText("Augmentez les prix.")).toBeInTheDocument();
});

test("falls back to empty buckets when notifications is not provided", () => {
  render(<DashboardNotifications notifications={null} />);
  expect(screen.getByText(/aucun problème détecté/i)).toBeInTheDocument();
});
