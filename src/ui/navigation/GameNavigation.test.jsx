import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GameNavigation from "./GameNavigation";

// GameNavigation re-exports the (now icon-styled) TopBar -- see its own
// docstring for why. This is a smoke test of that wiring, not a duplicate
// of TopBar.test.jsx's full coverage.
test("renders the hub bar with icon-labelled hubs and opens a hub's panel", () => {
  render(<GameNavigation />, { wrapper: MemoryRouter });

  expect(screen.getByRole("link", { name: "Hospitality Lab" })).toBeInTheDocument();
  const hotelHub = screen.getByRole("button", { name: "Hôtel" });
  expect(hotelHub).toHaveTextContent("🏨");

  fireEvent.click(hotelHub);
  const chambres = screen.getByRole("menuitem", { name: "Chambres" });
  expect(chambres).toHaveAttribute("href", "/rooms");
  expect(chambres).toHaveTextContent("🛏️");
});
