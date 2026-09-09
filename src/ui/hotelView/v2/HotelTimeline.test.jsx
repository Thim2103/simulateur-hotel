import { render, screen, fireEvent } from "@testing-library/react";
import HotelTimeline from "./HotelTimeline";

test("shows the day, event count and every segment of the day", () => {
  render(<HotelTimeline day={5} eventCount={2} onNextDay={() => {}} isRunning={false} />);
  expect(screen.getByText(/jour 5/i)).toBeInTheDocument();
  expect(screen.getByText(/2 événements/i)).toBeInTheDocument();
  ["Matin", "Midi", "Après-midi", "Soir", "Nuit"].forEach((label) => {
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

test("clicking 'Avancer la journée' calls onNextDay", () => {
  const onNextDay = jest.fn();
  render(<HotelTimeline day={1} eventCount={0} onNextDay={onNextDay} isRunning={false} />);
  fireEvent.click(screen.getByRole("button", { name: /avancer la journée/i }));
  expect(onNextDay).toHaveBeenCalledTimes(1);
});

test("disables the button and shows progress while running", () => {
  render(<HotelTimeline day={1} eventCount={0} onNextDay={() => {}} isRunning />);
  expect(screen.getByRole("button", { name: /calcul en cours/i })).toBeDisabled();
});
