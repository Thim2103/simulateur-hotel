import { render, screen, within } from "@testing-library/react";
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

function reviewWith(maintenance) {
  useDailyReview.mockReturnValue({
    review: { day: 4, summary: { revenue: 3000, profit: 200, satisfaction: 4, staffMorale: 60 }, causalChain: [], attentionItems: [], maintenance },
    isRunning: false,
    error: null,
    loadReview: jest.fn().mockResolvedValue(null),
  });
}

test("shows the day's upkeep bill, its level, the split by category and the hotel's condition", () => {
  reviewWith({ day: 4, rooms: 300, equipment: 80, floors: 40, total: 420, level: "premium", condition: 84 });
  render(<DailyReview />, { wrapper: MemoryRouter });

  expect(screen.getByRole("heading", { name: /entretien & charges d'exploitation/i })).toBeInTheDocument();
  expect(screen.getByTestId("maintenance-total")).toHaveTextContent(/420\s*€ aujourd'hui/);
  expect(screen.getByTestId("maintenance-total")).toHaveTextContent(/niveau premium/i);
  expect(within(screen.getByTestId("maintenance-line-rooms")).getByText(/chambres/i)).toBeInTheDocument();
  expect(screen.getByTestId("maintenance-line-equipment")).toHaveTextContent(/équipements/i);
  expect(screen.getByTestId("maintenance-line-floors")).toHaveTextContent(/étages/i);
  expect(screen.getByTestId("maintenance-condition")).toHaveTextContent("84/100");
});

test("leaves out the categories that cost nothing", () => {
  reviewWith({ day: 4, rooms: 30, equipment: 0, floors: 0, total: 30, level: "standard", condition: 80 });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("maintenance-line-rooms")).toBeInTheDocument();
  expect(screen.queryByTestId("maintenance-line-equipment")).not.toBeInTheDocument();
  expect(screen.queryByTestId("maintenance-line-floors")).not.toBeInTheDocument();
});

test("flags a run-down hotel", () => {
  reviewWith({ day: 4, rooms: 30, equipment: 0, floors: 0, total: 18, level: "economy", condition: 41 });
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.getByTestId("maintenance-condition")).toHaveClass("text-rose-700");
});

test("has no upkeep section when nothing was recorded", () => {
  reviewWith(null);
  render(<DailyReview />, { wrapper: MemoryRouter });
  expect(screen.queryByRole("heading", { name: /entretien & charges d'exploitation/i })).not.toBeInTheDocument();
});
