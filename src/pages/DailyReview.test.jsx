import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DailyReview from "./DailyReview";
import { useDailyReview } from "../hooks/useDailyReview";

jest.mock("../hooks/useDailyReview");

test("prompts to play a day when there is nothing to review yet", () => {
  useDailyReview.mockReturnValue({ review: null, isRunning: false, error: null, loadReview: jest.fn().mockResolvedValue(null) });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /aller à l'hôtel/i })).toHaveAttribute("href", "/dashboard");
});

test("shows the summary, causal chain and 'en savoir plus' links once a day has been played", () => {
  useDailyReview.mockReturnValue({
    review: {
      day: 4,
      date: "2026-01-04",
      summary: { revenue: 3000, profit: -200, satisfaction: 3.0, staffMorale: 40 },
      causalChain: ["Occupation très élevée aujourd'hui, ce qui a pu mettre le housekeeping sous pression."],
      attentionItems: [{ id: "p1", message: "Profit négatif.", moduleLink: "/finance", moduleLabel: "Finance" }],
    },
    isRunning: false,
    error: null,
    loadReview: jest.fn().mockResolvedValue(null),
  });
  render(<DailyReview />, { wrapper: MemoryRouter });

  expect(screen.getByRole("heading", { name: /jour 4/i })).toBeInTheDocument();
  expect(screen.getByText("3 000 €")).toBeInTheDocument();
  expect(screen.getByText(/housekeeping sous pression/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /finance/i })).toHaveAttribute("href", "/finance");
});
