import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import ProMenu from "./ProMenu";
import { useProEngine } from "../hooks/useProEngine";

jest.mock("../hooks/useProEngine");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

function proHook(overrides = {}) {
  return {
    isRunning: false,
    error: null,
    startPro: jest.fn().mockResolvedValue({ status: "active" }),
    ...overrides,
  };
}

test("shows size, positioning, segment and professional strategy options", () => {
  useProEngine.mockReturnValue(proHook());
  useNavigate.mockReturnValue(jest.fn());
  render(<ProMenu />, { wrapper: MemoryRouter });

  expect(screen.getByText("Boutique (10 chambres)")).toBeInTheDocument();
  expect(screen.getByText("Expansion")).toBeInTheDocument();
  expect(screen.getByText("Business")).toBeInTheDocument();
});

test("clicking 'Commencer le mode professionnel' calls startPro with the selected config and navigates to the dashboard", async () => {
  const startPro = jest.fn().mockResolvedValue({ status: "active" });
  const navigate = jest.fn();
  useProEngine.mockReturnValue(proHook({ startPro }));
  useNavigate.mockReturnValue(navigate);
  render(<ProMenu />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByText("Établissement moyen (30 chambres)"));
  fireEvent.click(screen.getByText("Haut de gamme"));
  fireEvent.click(screen.getByRole("button", { name: /commencer le mode professionnel/i }));

  expect(startPro).toHaveBeenCalledWith(expect.objectContaining({ roomCount: 30, positioningTier: "upscale" }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/pro/dashboard"));
});

test("shows an error banner when starting fails", () => {
  useProEngine.mockReturnValue(proHook({ error: new Error("boom") }));
  useNavigate.mockReturnValue(jest.fn());
  render(<ProMenu />, { wrapper: MemoryRouter });

  expect(screen.getByText(/une erreur est survenue/i)).toBeInTheDocument();
});
