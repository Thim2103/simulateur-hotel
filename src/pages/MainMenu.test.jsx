import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MainMenu from "./MainMenu";
import { useCareerContext } from "../context/CareerContext";

jest.mock("../context/CareerContext");

beforeEach(() => {
  useCareerContext.mockReturnValue({ careerState: null, loadCareerState: jest.fn().mockResolvedValue(null) });
});

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

test("shows the 'Nouvelle partie' and 'Académie' sections with their game modes", () => {
  render(<MainMenu />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /carrière/i })).toHaveAttribute("href", "/career");
  expect(screen.getByRole("link", { name: /sandbox/i })).toHaveAttribute("href", "/sandbox");
  expect(screen.getByRole("link", { name: /défis/i })).toHaveAttribute("href", "/challenges");
  expect(screen.getByRole("link", { name: /scénarios/i })).toHaveAttribute("href", "/scenarios");
  expect(screen.getByRole("link", { name: /academy/i })).toHaveAttribute("href", "/academy");
  expect(screen.getByRole("link", { name: /tfe/i })).toHaveAttribute("href", "/tfe");
  expect(screen.getByRole("link", { name: /compétition/i })).toHaveAttribute("href", "/competition");
});

test("does not show 'Continuer la carrière' when no career exists yet", () => {
  render(<MainMenu />, { wrapper: MemoryRouter });
  expect(screen.queryByRole("link", { name: /continuer la carrière/i })).not.toBeInTheDocument();
});

test("shows 'Continuer la carrière' linking to /dashboard when a career is already in progress", () => {
  useCareerContext.mockReturnValue({ careerState: { day: 4, status: "active" }, loadCareerState: jest.fn().mockResolvedValue(null) });
  render(<MainMenu />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /continuer la carrière/i })).toHaveAttribute("href", "/dashboard");
});
