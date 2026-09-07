import { render, screen, fireEvent } from "@testing-library/react";
import CareerRewards from "./CareerRewards";
import { useCareerContext } from "../context/CareerContext";

jest.mock("../context/CareerContext");

function baseHook(overrides = {}) {
  return {
    careerState: { rewardsInbox: [{ id: "cash-500-123", rewardId: "cash-500", label: "Prime de 500 €", type: "cash", sourceLabel: "Salle comble" }] },
    isRunning: false,
    error: null,
    claimReward: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

test("shows a prompt to start a career when none exists", () => {
  useCareerContext.mockReturnValue(baseHook({ careerState: null }));
  render(<CareerRewards />);
  expect(screen.getByText(/démarrez d'abord votre carrière/i)).toBeInTheDocument();
});

test("shows an empty state when the inbox is empty", () => {
  useCareerContext.mockReturnValue(baseHook({ careerState: { rewardsInbox: [] } }));
  render(<CareerRewards />);
  expect(screen.getByText(/aucune récompense en attente/i)).toBeInTheDocument();
});

test("shows every pending reward with its source", () => {
  useCareerContext.mockReturnValue(baseHook());
  render(<CareerRewards />);
  expect(screen.getByText("Prime de 500 €")).toBeInTheDocument();
  expect(screen.getByText(/salle comble/i)).toBeInTheDocument();
});

test("claiming a reward calls claimReward with its id", () => {
  const claimReward = jest.fn().mockResolvedValue({});
  useCareerContext.mockReturnValue(baseHook({ claimReward }));
  render(<CareerRewards />);

  fireEvent.click(screen.getByRole("button", { name: /réclamer/i }));
  expect(claimReward).toHaveBeenCalledWith("cash-500-123");
});
