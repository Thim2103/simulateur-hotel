import { render, screen, fireEvent } from "@testing-library/react";
import CareerStory from "./CareerStory";
import { useCareerContext } from "../context/CareerContext";

jest.mock("../context/CareerContext");

function baseHook(overrides = {}) {
  return {
    careerState: { storyline: { currentEventId: "staff-conflict", history: [] } },
    isRunning: false,
    error: null,
    triggerStoryEvent: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

test("shows a prompt to start a career when none exists", () => {
  useCareerContext.mockReturnValue(baseHook({ careerState: null }));
  render(<CareerStory />);
  expect(screen.getByText(/démarrez d'abord votre carrière/i)).toBeInTheDocument();
});

test("shows the current story event and its choices", () => {
  useCareerContext.mockReturnValue(baseHook());
  render(<CareerStory />);
  expect(screen.getByText("Tension en cuisine")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /organiser une médiation/i })).toBeInTheDocument();
});

test("choosing an option calls triggerStoryEvent with the event and choice ids", () => {
  const triggerStoryEvent = jest.fn().mockResolvedValue({});
  useCareerContext.mockReturnValue(baseHook({ triggerStoryEvent }));
  render(<CareerStory />);

  fireEvent.click(screen.getByRole("button", { name: /organiser une médiation/i }));
  expect(triggerStoryEvent).toHaveBeenCalledWith("staff-conflict", "mediate");
});

test("shows the resolved history with its consequence", () => {
  useCareerContext.mockReturnValue(
    baseHook({
      careerState: {
        storyline: {
          currentEventId: null,
          history: [{ eventId: "staff-conflict", day: 3, title: "Tension en cuisine", choiceLabel: "Organiser une médiation", consequence: { skillId: "leadership", skillPoints: 2 } }],
        },
      },
    })
  );
  render(<CareerStory />);
  expect(screen.getByText(/jour 3 · tension en cuisine/i)).toBeInTheDocument();
  expect(screen.getByText(/points de leadership/i)).toBeInTheDocument();
});
