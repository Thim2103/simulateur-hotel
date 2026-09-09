import { render, screen } from "@testing-library/react";
import HotelView2D from "./HotelView2D";

test("shows a placeholder when there are no rooms", () => {
  render(<HotelView2D roomCount={0} occupancyRate={0} />);
  expect(screen.getByText(/aucune chambre configurée/i)).toBeInTheDocument();
});

test("renders one room glyph per room, plus reception/restaurant/back-office", () => {
  render(<HotelView2D roomCount={12} occupancyRate={50} />);
  expect(screen.getAllByTitle(/chambre/i)).toHaveLength(12);
  expect(screen.getByText("Réception")).toBeInTheDocument();
  expect(screen.getByText("Restaurant")).toBeInTheDocument();
  expect(screen.getByText("Back-office")).toBeInTheDocument();
});

test("shows an incident glyph in the back-office when hasIncident is true", () => {
  const { container } = render(<HotelView2D roomCount={4} occupancyRate={50} hasIncident />);
  expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  expect(screen.getByText("❗")).toBeInTheDocument();
});
