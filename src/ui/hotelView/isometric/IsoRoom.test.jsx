import { render, screen } from "@testing-library/react";
import IsoRoom from "./IsoRoom";

test("shows the room number and its state in the title", () => {
  render(<IsoRoom col={0} row={0} state="occupied" number="204" />);
  expect(screen.getByTitle(/chambre 204 — occupée/i)).toBeInTheDocument();
});

test("defaults to the 'clean' visual state when none is given", () => {
  render(<IsoRoom col={0} row={0} number="101" />);
  expect(screen.getByTitle(/— propre/i)).toHaveClass("iso-room-clean");
});

test("positions itself using the isometric projection of its col/row", () => {
  render(<IsoRoom col={2} row={1} state="dirty" number="1" />);
  const tile = screen.getByTitle(/— sale/i);
  expect(tile.style.left).not.toBe("");
  expect(tile.style.top).not.toBe("");
});
