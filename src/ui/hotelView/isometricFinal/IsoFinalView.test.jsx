import { render, screen, fireEvent } from "@testing-library/react";
import IsoFinalView from "./IsoFinalView";

const ROOMS = [
  { id: 1, number: "101", status: "occupée", housekeeping_status: "clean" },
  { id: 2, number: "102", status: "libre", housekeeping_status: "dirty" },
];

test("shows a placeholder when there are no rooms", () => {
  render(<IsoFinalView day={1} rooms={[]} onNextDay={() => {}} isRunning={false} />);
  expect(screen.getByText(/aucune chambre configurée/i)).toBeInTheDocument();
});

test("renders the timeline, the rooms and all 6 ground-floor rooms", () => {
  render(
    <IsoFinalView
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
  expect(screen.getByTitle(/chambre 102 — sale/i)).toBeInTheDocument();
  expect(screen.getByText("Réception")).toBeInTheDocument();
  expect(screen.getByText("Restaurant")).toBeInTheDocument();
  expect(screen.getByText("Cuisine")).toBeInTheDocument();
  expect(screen.getByText("Bar")).toBeInTheDocument();
  expect(screen.getByText("Laundry")).toBeInTheDocument();
  expect(screen.getByText("Hall")).toBeInTheDocument();
  expect(screen.getByTitle("Panne électrique.")).toBeInTheDocument();
});

test("flags a room as 'en nettoyage' when it's in cleaningRoomIds", () => {
  render(<IsoFinalView day={1} rooms={ROOMS} cleaningRoomIds={new Set([1])} onNextDay={() => {}} isRunning={false} />);
  expect(screen.getByTitle(/chambre 101 — en nettoyage/i)).toBeInTheDocument();
});

test("clicking 'Avancer la journée' calls onNextDay", () => {
  const onNextDay = jest.fn();
  render(<IsoFinalView day={1} rooms={ROOMS} onNextDay={onNextDay} isRunning={false} />);
  fireEvent.click(screen.getByRole("button", { name: /avancer la journée/i }));
  expect(onNextDay).toHaveBeenCalledTimes(1);
});
