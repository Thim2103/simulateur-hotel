import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProOpportunities from "./ProOpportunities";
import { useProEngine } from "../hooks/useProEngine";

jest.mock("../hooks/useProEngine");

function proState(overrides = {}) {
  return {
    month: 9,
    horizonMonths: 24,
    opportunities: [
      { id: "subvention-esg", title: "Subvention ESG", description: "…", department: "esg", roiEstimate: 12000, status: "available" },
      { id: "partenariat-corporate", title: "Partenariat corporate", description: "…", department: "rm", roiEstimate: 24000, status: "seized" },
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
  render(<ProOpportunities />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /créer mon programme professionnel/i })).toHaveAttribute("href", "/pro");
});

test("shows opportunities with their ROI and status", () => {
  useProEngine.mockReturnValue(proHook({ proState: proState() }));
  render(<ProOpportunities />, { wrapper: MemoryRouter });

  expect(screen.getByText("Subvention ESG")).toBeInTheDocument();
  expect(screen.getByText("12 000 €")).toBeInTheDocument();
  expect(screen.getByText("Saisie")).toBeInTheDocument();
});

test("clicking 'Plan de relance globale' calls applyProAction", () => {
  const applyProAction = jest.fn().mockResolvedValue(null);
  useProEngine.mockReturnValue(proHook({ proState: proState(), applyProAction }));
  render(<ProOpportunities />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /plan de relance globale/i }));
  expect(applyProAction).toHaveBeenCalledWith("plan-relance-globale");
});
