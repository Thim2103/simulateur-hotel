import { render, screen } from "@testing-library/react";
import HotelRoomsLayer from "./HotelRoomsLayer";

test("shows a placeholder when there are no rooms", () => {
  render(<HotelRoomsLayer rooms={[]} />);
  expect(screen.getByText(/aucune chambre configurée/i)).toBeInTheDocument();
});

test("renders one tile per room, with its state in the title", () => {
  const rooms = [
    { id: 1, number: "101", status: "occupée", housekeeping_status: "clean" },
    { id: 2, number: "102", status: "libre", housekeeping_status: "dirty" },
    { id: 3, number: "103", status: "libre", housekeeping_status: "clean" },
  ];
  render(<HotelRoomsLayer rooms={rooms} />);

  expect(screen.getByTitle(/chambre 101 — occupée/i)).toBeInTheDocument();
  expect(screen.getByTitle(/chambre 102 — sale/i)).toBeInTheDocument();
  expect(screen.getByTitle(/chambre 103 — propre/i)).toBeInTheDocument();
});

test("shows a room flagged in cleaningRoomIds as 'en nettoyage', regardless of its persisted state", () => {
  const rooms = [{ id: 1, number: "101", status: "occupée", housekeeping_status: "dirty" }];
  render(<HotelRoomsLayer rooms={rooms} cleaningRoomIds={new Set([1])} />);
  expect(screen.getByTitle(/chambre 101 — en nettoyage/i)).toBeInTheDocument();
});
