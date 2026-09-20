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

const posted = (id, rating, extra = {}) => ({ id: `stay:${id}`, source: "stay", guestName: `Client ${id}`, profile: "family", weight: 1, rating, text: `Avis ${id}`, ...extra });

function reviewWith(guestReviews) {
  useDailyReview.mockReturnValue({
    review: { day: 4, summary: { revenue: 3000, profit: 200, satisfaction: 4, staffMorale: 60 }, causalChain: [], attentionItems: [], guestReviews },
    isRunning: false,
    error: null,
    loadReview: jest.fn().mockResolvedValue(null),
  });
}

test("lists the reviews left today with their stars, guest and text", () => {
  reviewWith({ posted: [posted(1, 5), posted(2, 2)], toAnswer: 0 });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByRole("heading", { name: /avis clients/i })).toBeInTheDocument();
  const items = screen.getAllByTestId("review-posted");
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent("Client 1");
  expect(items[0]).toHaveTextContent("Avis 1");
  expect(screen.getAllByLabelText(/note \d sur 5/i)).toHaveLength(2);
  expect(screen.queryByTestId("reviews-to-answer")).not.toBeInTheDocument();
});

test("highlights a V.I.P.'s review and its triple weight", () => {
  reviewWith({ posted: [posted(1, 1, { profile: "vip", weight: 3 })], toAnswer: 1 });
  render(<DailyReview />, { wrapper: MemoryRouter });
  const item = screen.getByTestId("review-posted");
  expect(item).toHaveAttribute("data-vip", "true");
  expect(item).toHaveTextContent(/v\.i\.p\..*poids ×3/i);
});

test("points to the reviews still waiting for an answer, with a link to answer them", () => {
  reviewWith({ posted: [], toAnswer: 3 });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucun nouvel avis aujourd'hui/i)).toBeInTheDocument();
  expect(screen.getByTestId("reviews-to-answer")).toHaveTextContent(/3 avis négatif\(s\) en attente de réponse/i);
  expect(screen.getByRole("link", { name: /répondre/i })).toHaveAttribute("href", "/clients/reviews");
});

test("has no guest-review section when there is nothing to report", () => {
  reviewWith(null);
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.queryByRole("heading", { name: /avis clients/i })).not.toBeInTheDocument();
});
