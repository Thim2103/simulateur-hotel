import { render, screen } from "@testing-library/react";
import CareerSkills from "./CareerSkills";
import { useCareerContext } from "../context/CareerContext";

jest.mock("../context/CareerContext");

test("shows a prompt to start a career when none exists", () => {
  useCareerContext.mockReturnValue({ careerState: null });
  render(<CareerSkills />);
  expect(screen.getByText(/démarrez d'abord votre carrière/i)).toBeInTheDocument();
});

test("shows every catalog skill with its level and points", () => {
  useCareerContext.mockReturnValue({
    careerState: { skills: { negotiation: { points: 23, level: 2 }, leadership: { points: 0, level: 0 }, management: { points: 0, level: 0 } } },
  });
  render(<CareerSkills />);

  expect(screen.getByText("Négociation")).toBeInTheDocument();
  expect(screen.getByText("Niveau 2")).toBeInTheDocument();
  expect(screen.getByText(/23 points/i)).toBeInTheDocument();
});

test("shows the current gameplay effect multipliers", () => {
  useCareerContext.mockReturnValue({
    careerState: { skills: { negotiation: { points: 10, level: 1 }, leadership: { points: 0, level: 0 }, management: { points: 0, level: 0 } } },
  });
  render(<CareerSkills />);
  expect(screen.getByText(/×1\.01/)).toBeInTheDocument();
});
