import { render, screen, fireEvent } from "@testing-library/react";
import HotelView2DAnimated from "./HotelView2DAnimated";

const ROOMS = [
  { id: 1, number: "101", status: "occupée", housekeeping_status: "clean" },
  { id: 2, number: "102", status: "libre", housekeeping_status: "dirty" },
];

test("renders the timeline, rooms, ground floor and incidents", () => {
  render(
    <HotelView2DAnimated
      day={4}
      rooms={ROOMS}
      staffCount={2}
      todaysEvents={[{ id: "weather", message: "Journée ensoleillée." }]}
      diagnostics={[{ type: "error", severity: "high", message: "Panne électrique." }]}
      onNextDay={() => {}}
      isRunning={false}
    />
  );

  expect(screen.getByText(/jour 4/i)).toBeInTheDocument();
  expect(screen.getByTitle(/chambre 101 — occupée/i)).toBeInTheDocument();
  expect(screen.getByText("Réception")).toBeInTheDocument();
  expect(screen.getByText("Restaurant")).toBeInTheDocument();
  expect(screen.getByText("Back-office")).toBeInTheDocument();
  expect(screen.getByText("Journée ensoleillée.")).toBeInTheDocument();
  expect(screen.getByText("Panne électrique.")).toBeInTheDocument();
});

test("clicking 'Avancer la journée' calls onNextDay", () => {
  const onNextDay = jest.fn();
  render(<HotelView2DAnimated day={1} rooms={ROOMS} onNextDay={onNextDay} isRunning={false} />);
  fireEvent.click(screen.getByRole("button", { name: /avancer la journée/i }));
  expect(onNextDay).toHaveBeenCalledTimes(1);
});

test("surfaces the player's last decision as a transient event badge", () => {
  render(
    <HotelView2DAnimated
      day={1}
      rooms={ROOMS}
      decisionFeedback={{ target: "rooms", animation: "pulse", nonce: 1 }}
      onNextDay={() => {}}
      isRunning={false}
    />
  );
  expect(screen.getByText(/décision : rooms/i)).toBeInTheDocument();
});
