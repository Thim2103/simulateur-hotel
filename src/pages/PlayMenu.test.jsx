import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlayMenu from "./PlayMenu";
import { useGuest } from "../hooks/useGuest";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { signInWithPassword, signUpWithPassword } from "../lib/auth";
import * as envModule from "../lib/env";

jest.mock("../hooks/useGuest");
jest.mock("../hooks/useSupabaseSession");
jest.mock("../lib/auth");
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  jest.clearAllMocks();
  useGuest.mockReturnValue({ createGuestSession: jest.fn() });
  useSupabaseSession.mockReturnValue({ session: { user: { id: "u1" }, mode: "supabase" }, loading: false, isGuest: false });
});

test("shows Se connecter and S'inscrire, and (dev mode) Mode invité", () => {
  render(<PlayMenu />, { wrapper: MemoryRouter });
  expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "S'inscrire" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Mode invité" })).toBeInTheDocument();
});

test("hides Mode invité outside dev mode when there is no guest session", () => {
  jest.spyOn(envModule, "isDevMode").mockReturnValue(false);
  render(<PlayMenu />, { wrapper: MemoryRouter });
  expect(screen.queryByRole("button", { name: "Mode invité" })).not.toBeInTheDocument();
  envModule.isDevMode.mockRestore();
});

test("shows Mode invité outside dev mode once a guest session already exists", () => {
  jest.spyOn(envModule, "isDevMode").mockReturnValue(false);
  useSupabaseSession.mockReturnValue({ session: { user: { id: "guest-1" }, mode: "guest" }, loading: false, isGuest: true });
  render(<PlayMenu />, { wrapper: MemoryRouter });
  expect(screen.getByRole("button", { name: "Mode invité" })).toBeInTheDocument();
  envModule.isDevMode.mockRestore();
});

test("clicking Mode invité creates a guest session and redirects to /select-mode", () => {
  const createGuestSession = jest.fn();
  useGuest.mockReturnValue({ createGuestSession });
  render(<PlayMenu />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: "Mode invité" }));

  expect(createGuestSession).toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith("/select-mode");
});

test("logging in with valid credentials redirects to /select-mode", async () => {
  signInWithPassword.mockResolvedValue({ session: { access_token: "t" }, user: { id: "u1" } });
  render(<PlayMenu />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "hunter22" } });
  fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/select-mode"));
  expect(signInWithPassword).toHaveBeenCalledWith("a@b.com", "hunter22");
});

test("a failed login shows the error instead of navigating", async () => {
  signInWithPassword.mockRejectedValue(new Error("Invalid login credentials"));
  render(<PlayMenu />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "wrong" } });
  fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

  await waitFor(() => expect(screen.getByText("Invalid login credentials")).toBeInTheDocument());
  expect(mockNavigate).not.toHaveBeenCalled();
});

test("signing up shows a confirmation message when Supabase requires email confirmation", async () => {
  signUpWithPassword.mockResolvedValue({ session: null, user: { id: "u1" } });
  render(<PlayMenu />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: "S'inscrire" }));
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "hunter22" } });
  fireEvent.click(screen.getByRole("button", { name: "S'inscrire" }));

  await waitFor(() => expect(screen.getByText(/vérifiez votre boîte mail/i)).toBeInTheDocument());
  expect(mockNavigate).not.toHaveBeenCalled();
});

test("the 'Retour' link goes back to the initial choice screen", () => {
  render(<PlayMenu />, { wrapper: MemoryRouter });
  fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
  expect(screen.getByLabelText("Email")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /retour/i }));
  expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
});
