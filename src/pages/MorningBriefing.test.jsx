import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MorningBriefing from "./MorningBriefing";
import { useMorningBriefing } from "../hooks/useMorningBriefing";

jest.mock("../hooks/useMorningBriefing");

test("shows a loading state before the briefing is ready", () => {
  useMorningBriefing.mockReturnValue({ briefing: null, isRunning: true, error: null, loadBriefing: jest.fn().mockResolvedValue(null) });
  render(<MorningBriefing />, { wrapper: MemoryRouter });
  expect(screen.getByRole("status")).toBeInTheDocument();
});

test("shows day, kpis, situation, objectives and alerts once loaded", () => {
  useMorningBriefing.mockReturnValue({
    briefing: {
      day: 5,
      date: "2026-01-05",
      kpis: { occupancyRate: 90, adr: 120, cash: 15000, staffMorale: 70, satisfaction: 4.2, reputation: 80 },
      situation: "Forte demande : 90% d'occupation.",
      objectives: { acceptedMissions: [{ id: "m1", title: "Améliorer le NPS" }], achievedObjectivesCount: 2, totalObjectives: 5 },
      alerts: [{ id: "a1", message: "Moral bas.", moduleLink: "/staff", moduleLabel: "Personnel" }],
    },
    isRunning: false,
    error: null,
    loadBriefing: jest.fn().mockResolvedValue(null),
  });
  render(<MorningBriefing />, { wrapper: MemoryRouter });

  expect(screen.getByRole("heading", { name: /jour 5/i })).toBeInTheDocument();
  expect(screen.getByText(/forte demande/i)).toBeInTheDocument();
  expect(screen.getByText((content, element) => element.tagName === "LI" && element.textContent === "• Améliorer le NPS")).toBeInTheDocument();
  expect(screen.getByText("Moral bas.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /aller à l'hôtel/i })).toHaveAttribute("href", "/dashboard");
});
