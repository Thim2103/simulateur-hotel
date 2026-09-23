import { render, screen, fireEvent, within } from "@testing-library/react";
import HotelSchematicView from "./HotelSchematicView";

const rooms = [
  { id: 1, number: "101", status: "libre", housekeeping_status: "clean", capacity: 2 },
  { id: 2, number: "102", status: "occupée", housekeeping_status: "clean", capacity: 2 },
  { id: 3, number: "103", status: "libre", housekeeping_status: "dirty", capacity: 2 },
  { id: 4, number: "104", status: "libre", housekeeping_status: "clean", capacity: 2 },
];

const reservations = [
  { id: 1, room_id: 2, client_name: "Ada Lovelace", arrival: "2026-09-20", departure: "2026-09-25", status: "confirmée" },
];

test("shows the reception's arrivals/departures and the 4 rooms with their state badges", () => {
  render(<HotelSchematicView rooms={rooms} reservations={reservations} date="2026-09-23" />);

  expect(screen.getByTestId("schematic-reception")).toHaveTextContent("0 arrivée, 0 départ aujourd'hui");
  expect(screen.getByTestId("schematic-breakfast")).toHaveTextContent("2 couverts prévus");

  expect(screen.getByTestId("schematic-starter-room-101")).toHaveTextContent("Prête");
  expect(screen.getByTestId("schematic-starter-room-102")).toHaveTextContent("Occupée");
  expect(screen.getByTestId("schematic-starter-room-103")).toHaveTextContent("À nettoyer");
});

test("clicking a room opens a modal with its status and, if occupied, the guest's name", () => {
  render(<HotelSchematicView rooms={rooms} reservations={reservations} date="2026-09-23" />);

  fireEvent.click(screen.getByTestId("schematic-starter-room-102"));
  const dialog = screen.getByRole("dialog", { name: "Chambre 102" });
  expect(within(dialog).getByText("Ada Lovelace")).toBeInTheDocument();
});

test("a dirty room's modal offers 'Lancer le nettoyage', wired to onPriorityClean with the real room id", () => {
  const onPriorityClean = jest.fn();
  render(<HotelSchematicView rooms={rooms} reservations={reservations} date="2026-09-23" onPriorityClean={onPriorityClean} />);

  fireEvent.click(screen.getByTestId("schematic-starter-room-103"));
  fireEvent.click(screen.getByRole("button", { name: "Lancer le nettoyage" }));
  expect(onPriorityClean).toHaveBeenCalledWith(3);
});

test("a room already being cleaned shows a disabled state instead of the action", () => {
  render(<HotelSchematicView rooms={rooms} reservations={reservations} date="2026-09-23" cleaningRoomIds={new Set([3])} />);

  expect(screen.getByTestId("schematic-starter-room-103")).toHaveTextContent("Nettoyage en cours");
  fireEvent.click(screen.getByTestId("schematic-starter-room-103"));
  const dialog = screen.getByRole("dialog", { name: "Chambre 103" });
  expect(within(dialog).getByRole("button", { name: /nettoyage en cours/i })).toBeDisabled();
});

test("a clean, unoccupied room's modal offers no cleaning action, only the yield shortcut when provided", () => {
  const onOpenYield = jest.fn();
  render(<HotelSchematicView rooms={rooms} reservations={reservations} date="2026-09-23" onOpenYield={onOpenYield} />);

  fireEvent.click(screen.getByTestId("schematic-starter-room-101"));
  expect(screen.queryByRole("button", { name: /nettoyage/i })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /ajuster les tarifs/i }));
  expect(onOpenYield).toHaveBeenCalled();
});
