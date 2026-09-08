import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EsgCertifications from "./EsgCertifications";
import { useEsgEngine } from "../hooks/useEsgEngine";

jest.mock("../hooks/useEsgEngine");

function certificationsFixture() {
  return [
    {
      id: "green-key",
      name: "Green Key",
      description: "Label international...",
      obtained: true,
      eligible: true,
      progress: 100,
      checks: [{ label: "Score ESG ≥ 55", met: true }],
      impact: { reputationBonus: 3, financeReduction: 0.02 },
    },
    {
      id: "earthcheck",
      name: "EarthCheck",
      description: "Certification avancée...",
      obtained: false,
      eligible: false,
      progress: 40,
      checks: [{ label: "Score ESG ≥ 65", met: false }, { label: "Énergie ≤ 350 kWh", met: true }],
      impact: { reputationBonus: 5, financeReduction: 0.03 },
    },
  ];
}

function esgHook(overrides = {}) {
  return {
    esgState: null,
    isRunning: false,
    error: null,
    loadEsgState: jest.fn().mockResolvedValue(null),
    getCertifications: jest.fn(() => []),
    applyEsgAction: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("loads the ESG state on mount", () => {
  const loadEsgState = jest.fn().mockResolvedValue(null);
  useEsgEngine.mockReturnValue(esgHook({ loadEsgState }));
  render(<EsgCertifications />, { wrapper: MemoryRouter });
  expect(loadEsgState).toHaveBeenCalled();
});

test("shows a placeholder before any ESG cycle exists", () => {
  useEsgEngine.mockReturnValue(esgHook());
  render(<EsgCertifications />, { wrapper: MemoryRouter });
  expect(screen.getByText(/aucune donnée esg/i)).toBeInTheDocument();
});

test("shows each certification's progress and requirement checks", () => {
  useEsgEngine.mockReturnValue(esgHook({ esgState: {}, getCertifications: () => certificationsFixture() }));
  render(<EsgCertifications />, { wrapper: MemoryRouter });

  expect(screen.getByText("Green Key")).toBeInTheDocument();
  expect(screen.getByText("Obtenue")).toBeInTheDocument();
  expect(screen.getByText("EarthCheck")).toBeInTheDocument();
  expect(screen.getByText("40%")).toBeInTheDocument();
});

test("clicking 'Obtenir cette certification' calls applyEsgAction with the certification id", () => {
  const applyEsgAction = jest.fn().mockResolvedValue(null);
  // EarthCheck (not obtained) is eligible here so its button is enabled.
  const eligibleFixture = certificationsFixture().map((c) => (c.id === "earthcheck" ? { ...c, eligible: true } : c));
  useEsgEngine.mockReturnValue(esgHook({ esgState: {}, getCertifications: () => eligibleFixture, applyEsgAction }));
  render(<EsgCertifications />, { wrapper: MemoryRouter });

  fireEvent.click(screen.getByRole("button", { name: /obtenir cette certification/i }));
  expect(applyEsgAction).toHaveBeenCalledWith("obtenir-certification", { certificationId: "earthcheck" });
});
