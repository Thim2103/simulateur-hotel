import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Solo from "./Solo";

test("hands off to the Career mode", () => {
  render(<Solo />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /continuer vers le mode carrière/i })).toHaveAttribute("href", "/career");
});
