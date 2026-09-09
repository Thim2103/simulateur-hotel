import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProAudits from "./ProAudits";
import { useProEngine } from "../hooks/useProEngine";

jest.mock("../hooks/useProEngine");

function proState(overrides = {}) {
  return {
    month: 6,
    horizonMonths: 24,
    audits: [
      { department: "finance", score: 75, grade: "B", month: 6, findings: ["Marge EBITDA positive."] },
      { department: "staff", score: 40, grade: "D", month: 6, findings: ["Moral d'équipe : 40/100."] },
    ],
    ...overrides,
  };
}

function proHook(overrides = {}) {
  return {
    proState: null, isRunning: false, error: null,
    loadProState: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

test("prompts to create a program when no Pro run is in progress", () => {
  useProEngine.mockReturnValue(proHook());
  render(<ProAudits />, { wrapper: MemoryRouter });
  expect(screen.getByRole("link", { name: /créer mon programme professionnel/i })).toHaveAttribute("href", "/pro");
});

test("prompts to play a month when no audits yet", () => {
  useProEngine.mockReturnValue(proHook({ proState: proState({ audits: [] }) }));
  render(<ProAudits />, { wrapper: MemoryRouter });
  expect(screen.getByText(/jouez un mois/i)).toBeInTheDocument();
});

test("shows audit cards per department with score, grade and findings", () => {
  useProEngine.mockReturnValue(proHook({ proState: proState() }));
  render(<ProAudits />, { wrapper: MemoryRouter });

  // "• {finding}" renders as two adjacent text nodes -- match with a
  // function matcher against the finding's own <li> text content.
  expect(screen.getByText((content, element) => element.tagName === "LI" && element.textContent === "• Marge EBITDA positive.")).toBeInTheDocument();
  expect(screen.getByText("75/100")).toBeInTheDocument();
  expect(screen.getByText("D")).toBeInTheDocument();
});
