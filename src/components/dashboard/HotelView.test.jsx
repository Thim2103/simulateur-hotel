import { render, screen } from "@testing-library/react";
import HotelView from "./HotelView";

test("shows a placeholder when there are no rooms", () => {
  render(<HotelView roomCount={0} occupancyRate={0} />);
  expect(screen.getByText(/aucune chambre configurée/i)).toBeInTheDocument();
});

test("renders one room icon per room, grouped by floor, plus the ground-floor/back-office badges", () => {
  render(<HotelView roomCount={12} occupancyRate={50} />);
  expect(screen.getAllByTitle(/chambre/i)).toHaveLength(12);
  expect(screen.getByText(/réception/i)).toBeInTheDocument();
  expect(screen.getByText(/housekeeping/i)).toBeInTheDocument();
});
