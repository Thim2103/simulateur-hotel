import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProCrises from "./ProCrises";
import { useProEngine } from "../hooks/useProEngine";

jest.mock("../hooks/useProEngine");

function proState(overrides = {}) {
  return {
    month: 6,
    horizonMonths: 24,
    crises: [
      { id: "inflation", title: "Poussée inflationniste", description: "…", department: "finance", active: true, monthsRemaining: 3 },
      { id: "penurie-staff", title: "Pénurie de personnel", description: "…", department: "staff", active: false, resolvedOnMonth: 5 },
    ],
    ...overrides,
  };
}

function proHook(overrides = {}) {
  return {
    proState: null, isRunning: false, error: null,
    loadProState: jest.fn().mockResolvedValue(null),
    applyProAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("prompts to create a program when no Pro run is in progress", () => {
  useProEngine.mockReturnValue(proHook());
  render(<ProCrises />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /créer mon programme professionnel/i })).toHaveAttribute("href", "/pro");
});

test("shows active and resolved crises", () => {
  useProEngine.mockReturnValue(proHook({ proState: proState() }));
  render(<ProCrises />, { wrapper: MemoryRouter });

  expect(screen.getByText("Poussée inflationniste")).toBeInTheDocument();
  expect(screen.getByText("Pénurie de personnel")).toBeInTheDocument();
  expect(screen.getByText(/Résolue au mois 5/)).toBeInTheDocument();
});

test("clicking 'Plan d'austérité' calls applyProAction", () => {
  const applyProAction = jest.fn().mockResolvedValue(null);
  useProEngine.mockReturnValue(proHook({ proState: proState(), applyProAction }));
  render(<ProCrises />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /plan d'austérité/i }));
  expect(applyProAction).toHaveBeenCalledWith("plan-austerite");
});
