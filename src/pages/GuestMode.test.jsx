import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GuestMode from "./GuestMode";
import { useGuest } from "../hooks/useGuest";

jest.mock("../hooks/useGuest");
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

function baseHook(overrides = {}) {
  return { guestSession: null, createGuestSession: jest.fn(), resetGuestSession: jest.fn(), ...overrides };
}

beforeEach(() => {
  mockNavigate.mockClear();
});

test("shows a prompt to play as guest when no session exists yet", () => {
  useGuest.mockReturnValue(baseHook());
  render(<GuestMode />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune session invité pour le moment/i)).toBeInTheDocument();
});

test("shows that a guest session already exists", () => {
  useGuest.mockReturnValue(baseHook({ guestSession: { user: { id: "guest-1" }, mode: "guest" } }));
  render(<GuestMode />, { wrapper: MemoryRouter });
  expect(screen.getByText(/une session invité existe déjà/i)).toBeInTheDocument();
});

test("clicking 'Jouer en mode invité' creates a session and redirects to /select-mode", () => {
  const createGuestSession = jest.fn();
  useGuest.mockReturnValue(baseHook({ createGuestSession }));
  render(<GuestMode />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /jouer en mode invité/i }));

  expect(createGuestSession).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith("/select-mode");
});

test("does not show a 'Quitter le mode invité' button when there is no session yet", () => {
  useGuest.mockReturnValue(baseHook());
  render(<GuestMode />, { wrapper: MemoryRouter });
  expect(screen.queryByRole("button", { name: /quitter le mode invité/i })).not.toBeInTheDocument();
});

test("clicking 'Quitter le mode invité' resets the session and redirects to /menu", () => {
  const resetGuestSession = jest.fn();
  useGuest.mockReturnValue(baseHook({ guestSession: { user: { id: "guest-1" }, mode: "guest" }, resetGuestSession }));
  render(<GuestMode />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /quitter le mode invité/i }));

  expect(resetGuestSession).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith("/menu");
});
