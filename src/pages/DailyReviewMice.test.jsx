import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DailyReview from "./DailyReview";
import { useDailyReview } from "../hooks/useDailyReview";
import { useGmDesk } from "../ui/gmDesk/GmDeskProvider";

jest.mock("../hooks/useDailyReview");
jest.mock("../ui/gmDesk/GmDeskProvider", () => ({
  ...jest.requireActual("../ui/gmDesk/GmDeskProvider"),
  useGmDesk: jest.fn(),
}));

beforeEach(() => {
  useGmDesk.mockReturnValue({ messages: [], applyMessageDecision: jest.fn() });
});

const event = (extra = {}) => ({ id: 1, company: "Novatek Solutions", attendees: 40, days: 2, startDate: "2026-09-20", meetingRoomNumber: "S01", cateringPerDay: 900, quote: { total: 6400 }, ...extra });

function reviewWith(mice) {
  useDailyReview.mockReturnValue({
    review: { day: 4, summary: { revenue: 3000, profit: 200, satisfaction: 4, staffMorale: 60 }, causalChain: [], attentionItems: [], mice },
    isRunning: false,
    error: null,
    loadReview: jest.fn().mockResolvedValue(null),
  });
}

test("announces a new quote", () => {
  reviewWith({ newRequests: [{ id: 3, company: "Pharma Sud", attendees: 60, days: 1, startDate: "2026-09-28" }], today: [], startingSoon: [], completed: [], pending: 1 });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByRole("heading", { name: /séminaires & événements pro/i })).toBeInTheDocument();
  expect(screen.getByTestId("mice-new")).toHaveTextContent(/nouvelle demande.*pharma sud.*60 personnes, 1 jour/i);
});

test("shows the event under way with its catering, the ones starting soon and the finished ones", () => {
  reviewWith({ newRequests: [], today: [event()], startingSoon: [event({ id: 2, company: "Altis Conseil" })], completed: [event({ id: 3, company: "Solaris Énergie" })], pending: 0 });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("mice-today")).toHaveTextContent(/novatek solutions aujourd'hui.*salle S01.*40 personnes.*900\s*€ de restauration/i);
  expect(screen.getByTestId("mice-soon")).toHaveTextContent(/altis conseil démarre le 2026-09-20/i);
  expect(screen.getByTestId("mice-completed")).toHaveTextContent(/solaris énergie terminé.*6\s*400\s*€ de chiffre d'affaires/i);
});

test("points to the quotes still waiting, with a link to answer them", () => {
  reviewWith({ newRequests: [], today: [], startingSoon: [], completed: [], pending: 2 });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("mice-pending")).toHaveTextContent("2 devis en attente");
  expect(screen.getByRole("link", { name: /les traiter/i })).toHaveAttribute("href", "/corporate/events");
});

test("has no seminar section when there is nothing to report", () => {
  reviewWith(null);
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.queryByRole("heading", { name: /séminaires & événements pro/i })).not.toBeInTheDocument();
});
