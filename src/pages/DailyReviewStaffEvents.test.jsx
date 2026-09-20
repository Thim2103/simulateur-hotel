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

function reviewWith(staffEvents) {
  useDailyReview.mockReturnValue({
    review: { day: 4, summary: { revenue: 3000, profit: 200, satisfaction: 4, staffMorale: 60 }, causalChain: [], attentionItems: [], staffEvents },
    isRunning: false,
    error: null,
    loadReview: jest.fn().mockResolvedValue(null),
  });
}

test("lists resignations, notices and sick leave, each typed for styling, with a link to the team", () => {
  reviewWith([
    { id: "a", type: "resigned", message: "Ada (housekeeping) a démissionné : moral trop bas après une période de surmenage." },
    { id: "b", type: "sick", message: "Bob est en arrêt maladie demain : son poste n'est pas couvert." },
  ]);
  render(<DailyReview />, { wrapper: MemoryRouter });

  expect(screen.getByRole("heading", { name: /ressources humaines/i })).toBeInTheDocument();
  const items = screen.getAllByTestId("staff-event");
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent(/ada.*a démissionné/i);
  expect(items[0]).toHaveAttribute("data-type", "resigned");
  expect(items[1]).toHaveAttribute("data-type", "sick");
  expect(screen.getByRole("link", { name: /gérer l'équipe/i })).toHaveAttribute("href", "/staff");
});

test("shows nothing when there is no HR news", () => {
  reviewWith([]);
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.queryByRole("heading", { name: /ressources humaines/i })).not.toBeInTheDocument();
});

test("an unknown event type still shows, with a neutral style", () => {
  reviewWith([{ id: "z", type: "something-new", message: "Un événement inédit." }]);
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("staff-event")).toHaveTextContent("Un événement inédit.");
});
