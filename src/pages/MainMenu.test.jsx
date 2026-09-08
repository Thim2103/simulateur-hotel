import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MainMenu from "./MainMenu";

test("shows the game's title", () => {
  render(<MainMenu />, { wrapper: MemoryRouter });
  expect(screen.getByRole("heading", { name: "Hospitality Lab" })).toBeInTheDocument();
});

test("links to Jouer, Options and Crédits", () => {
  render(<MainMenu />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: "Jouer" })).toHaveAttribute("href", "/play");
  expect(screen.getByRole("link", { name: "Options" })).toHaveAttribute("href", "/options");
  expect(screen.getByRole("link", { name: "Crédits" })).toHaveAttribute("href", "/credits");
});

test("does not show a Quitter button on a web build", () => {
  render(<MainMenu />, { wrapper: MemoryRouter });
  expect(screen.queryByRole("button", { name: /quitter/i })).not.toBeInTheDocument();
});

test("shows a Quitter button when running as a desktop build", () => {
  window.electronAPI = {};
  render(<MainMenu />, { wrapper: MemoryRouter });
  expect(screen.getByRole("button", { name: /quitter/i })).toBeInTheDocument();
  delete window.electronAPI;
});
