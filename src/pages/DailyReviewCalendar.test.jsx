import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DailyReview from "./DailyReview";
import { useDailyReview } from "../hooks/useDailyReview";
import { useGmDesk } from "../ui/gmDesk/GmDeskProvider";

vi.mock("../hooks/useDailyReview");
vi.mock("../ui/gmDesk/GmDeskProvider", async (importOriginal) => ({
  ...(await importOriginal()),
  useGmDesk: jest.fn(),
}));

beforeEach(() => {
  useGmDesk.mockReturnValue({ messages: [], applyMessageDecision: jest.fn() });
});

const season = { id: "summer", label: "Haute saison — été", icon: "☀️", tier: "high", demandPercent: 40, effects: [] };
const festival = { id: "festival", name: "Festival local", icon: "🎪", kind: "demand", totalDays: 3, dayNumber: 2, daysLeft: 1, endsToday: false, startsInDays: -1, effects: ["Demande +30 %"] };

function reviewWith(calendar) {
  useDailyReview.mockReturnValue({
    review: { day: 4, summary: { revenue: 3000, profit: 200, satisfaction: 4, staffMorale: 60 }, causalChain: [], attentionItems: [], calendar },
    isRunning: false,
    error: null,
    loadReview: jest.fn().mockResolvedValue(null),
  });
}

test("shows the season with its demand effect", () => {
  reviewWith({ season, ongoing: [], upcoming: [], audit: null });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByRole("heading", { name: /saison & événements/i })).toBeInTheDocument();
  expect(screen.getByTestId("calendar-season")).toHaveAttribute("data-tier", "high");
  expect(screen.getByTestId("calendar-season")).toHaveTextContent(/haute saison.*demande \+40 %/i);
  expect(screen.getByText(/aucun événement en cours ni annoncé/i)).toBeInTheDocument();
});

test("lists an event in progress with its day and effects", () => {
  reviewWith({ season, ongoing: [festival], upcoming: [], audit: null });
  render(<DailyReview />, { wrapper: MemoryRouter });
  const item = screen.getByTestId("calendar-ongoing");
  expect(item).toHaveAttribute("data-event", "festival");
  expect(item).toHaveTextContent(/festival local.*jour 2\/3/i);
  expect(item).toHaveTextContent("Demande +30 %");
  expect(screen.queryByText(/aucun événement en cours/i)).not.toBeInTheDocument();
});

test("says when an event ends today", () => {
  reviewWith({ season, ongoing: [{ ...festival, dayNumber: 3, endsToday: true, daysLeft: 0 }], upcoming: [], audit: null });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("calendar-ongoing")).toHaveTextContent(/dernier jour.*se termine aujourd'hui/i);
});

test("announces an event to come", () => {
  reviewWith({ season, ongoing: [], upcoming: [{ ...festival, startsInDays: 2, dayNumber: -1 }], audit: null });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("calendar-upcoming")).toHaveTextContent(/festival local.*dans 2 jours \(3 j\)/i);
});

test("reports the audit result, styled by outcome", () => {
  const audit = (outcome, message) => ({ outcome, message, score: 90 });
  reviewWith({ season, ongoing: [], upcoming: [], audit: audit("label", "Audit hôtelier réussi (90/100) : votre établissement obtient le Label Qualité.") });
  const { unmount } = render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("calendar-audit")).toHaveAttribute("data-outcome", "label");
  expect(screen.getByTestId("calendar-audit")).toHaveTextContent(/label qualité/i);
  expect(screen.getByTestId("calendar-audit")).toHaveClass("bg-emerald-50");
  unmount();

  reviewWith({ season, ongoing: [], upcoming: [], audit: audit("warning", "Audit hôtelier défavorable (40/100) : avertissement de l'inspecteur.") });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("calendar-audit")).toHaveClass("bg-rose-50");
});

test("has no calendar section before any day was played", () => {
  reviewWith(null);
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.queryByRole("heading", { name: /saison & événements/i })).not.toBeInTheDocument();
});
