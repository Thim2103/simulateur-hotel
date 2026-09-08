import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SelectMode from "./SelectMode";

test("links every mode to its own route", () => {
  render(<SelectMode />, { wrapper: MemoryRouter });

  expect(screen.getByRole("link", { name: /mode solo/i })).toHaveAttribute("href", "/solo");
  expect(screen.getByRole("link", { name: /^carrière/i })).toHaveAttribute("href", "/career");
  expect(screen.getByRole("link", { name: /sandbox/i })).toHaveAttribute("href", "/sandbox");
  expect(screen.getByRole("link", { name: /scénarios/i })).toHaveAttribute("href", "/scenarios");
  expect(screen.getByRole("link", { name: /challenges/i })).toHaveAttribute("href", "/challenges");
});
