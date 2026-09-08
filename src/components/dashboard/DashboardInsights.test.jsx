import { render, screen } from "@testing-library/react";
import DashboardInsights from "./DashboardInsights";

test("shows a placeholder before any day has been played", () => {
  render(<DashboardInsights insights={{ hasInsights: false, diagnostics: [], recommendations: [] }} />);
  expect(screen.getByText(/jouez une journée/i)).toBeInTheDocument();
});

test("shows an empty-state message when there is nothing to recommend", () => {
  render(<DashboardInsights insights={{ hasInsights: true, diagnostics: [], recommendations: [] }} />);
  expect(screen.getByText(/rien à signaler/i)).toBeInTheDocument();
});

test("shows up to 3 recommendations, most severe first", () => {
  const insights = {
    hasInsights: true,
    diagnostics: [],
    recommendations: [
      { text: "Rec basse", severity: "low" },
      { text: "Rec haute", severity: "high" },
      { text: "Rec moyenne", severity: "medium" },
      { text: "Rec haute 2", severity: "high" },
    ],
  };
  render(<DashboardInsights insights={insights} />);
  expect(screen.getByText("Rec haute")).toBeInTheDocument();
  expect(screen.getByText("Rec haute 2")).toBeInTheDocument();
  expect(screen.getByText("Rec moyenne")).toBeInTheDocument();
  expect(screen.queryByText("Rec basse")).not.toBeInTheDocument();
});
