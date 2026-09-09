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

test("shows each mode's description, difficulty, duration and a 'Lancer' call to action", () => {
  render(<SelectMode />, { wrapper: MemoryRouter });
  const soloCard = screen.getByRole("link", { name: /mode solo/i });
  expect(soloCard).toHaveTextContent("Prenez en main un hôtel et progressez à votre rythme.");
  expect(soloCard).toHaveTextContent("Facile");
  expect(soloCard).toHaveTextContent("Libre");
  expect(soloCard).toHaveTextContent("Lancer");
});
