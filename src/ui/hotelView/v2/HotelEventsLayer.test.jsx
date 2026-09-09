import { render, screen, act } from "@testing-library/react";
import HotelEventsLayer from "./HotelEventsLayer";

test("shows a placeholder when there is nothing to show", () => {
  render(<HotelEventsLayer todaysEvents={[]} />);
  expect(screen.getByText(/aucun événement particulier/i)).toBeInTheDocument();
});

test("renders one badge per today's event, using its message", () => {
  const events = [{ id: "weather", message: "Journée ensoleillée, forte demande." }];
  render(<HotelEventsLayer todaysEvents={events} />);
  expect(screen.getByText("Journée ensoleillée, forte demande.")).toBeInTheDocument();
});

test("adds a decision-feedback badge and auto-dismisses it", async () => {
  jest.useFakeTimers();
  const { rerender } = render(<HotelEventsLayer todaysEvents={[]} decisionFeedback={null} />);

  rerender(<HotelEventsLayer todaysEvents={[]} decisionFeedback={{ target: "rooms", animation: "pulse", nonce: 1 }} />);
  expect(screen.getByText(/décision : rooms/i)).toBeInTheDocument();

  act(() => {
    jest.advanceTimersByTime(4000);
  });
  expect(screen.queryByText(/décision : rooms/i)).not.toBeInTheDocument();
  jest.useRealTimers();
});
