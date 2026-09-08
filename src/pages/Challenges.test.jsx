import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Challenges from "./Challenges";

test("hands off to the Competition module", () => {
  render(<Challenges />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /continuer vers la compétition/i })).toHaveAttribute("href", "/competition");
});
