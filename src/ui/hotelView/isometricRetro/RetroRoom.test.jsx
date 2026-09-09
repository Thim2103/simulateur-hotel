import { render, screen } from "@testing-library/react";
import RetroRoom from "./RetroRoom";

test("shows the room number and its state in the title", () => {
  render(<RetroRoom col={0} row={0} state="occupied" number="204" />);
  expect(screen.getByTitle(/chambre 204 — occupée/i)).toBeInTheDocument();
});

test("defaults to the 'clean' visual state when none is given", () => {
  render(<RetroRoom col={0} row={0} number="101" />);
  expect(screen.getByTitle(/— propre/i)).toHaveClass("retro-room-clean");
});

test("scatters the room's own decorative props inside the tile", () => {
  render(<RetroRoom col={0} row={0} state="dirty" number="1" />);
  const tile = screen.getByTitle(/— sale/i);
  expect(tile).toHaveTextContent("🗑️");
  expect(tile).toHaveTextContent("👕");
});
