import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import TfeMenu from "./TfeMenu";
import { useTfeEngine } from "../hooks/useTfeEngine";

jest.mock("../hooks/useTfeEngine");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

function tfeHook(overrides = {}) {
  return {
    isRunning: false,
    error: null,
    startTfe: jest.fn().mockResolvedValue({ status: "active" }),
    ...overrides,
  };
}

test("shows size, positioning, segment and strategy options", () => {
  useTfeEngine.mockReturnValue(tfeHook());
  useNavigate.mockReturnValue(jest.fn());
  render(<TfeMenu />, { wrapper: MemoryRouter });

  expect(screen.getByText("Boutique (10 chambres)")).toBeInTheDocument();
  expect(screen.getByText("Croissance")).toBeInTheDocument();
  expect(screen.getByText("Business")).toBeInTheDocument();
});

test("clicking 'Commencer le TFE' calls startTfe with the selected config and navigates to the dashboard", async () => {
  const startTfe = jest.fn().mockResolvedValue({ status: "active" });
  const navigate = jest.fn();
  useTfeEngine.mockReturnValue(tfeHook({ startTfe }));
  useNavigate.mockReturnValue(navigate);
  render(<TfeMenu />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByText("Établissement moyen (30 chambres)"));
  fireEvent.click(screen.getByText("Haut de gamme"));
  fireEvent.click(screen.getByRole("button", { name: /commencer le tfe/i }));

  expect(startTfe).toHaveBeenCalledWith(expect.objectContaining({ roomCount: 30, positioningTier: "upscale" }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/tfe/dashboard"));
});

test("shows an error banner when starting fails", () => {
  useTfeEngine.mockReturnValue(tfeHook({ error: new Error("boom") }));
  useNavigate.mockReturnValue(jest.fn());
  render(<TfeMenu />, { wrapper: MemoryRouter });

  expect(screen.getByText(/une erreur est survenue/i)).toBeInTheDocument();
});
