import { render, screen, fireEvent } from "@testing-library/react";
import GameButton from "./GameButton";

test("renders its label and responds to clicks", () => {
  const onClick = jest.fn();
  render(<GameButton onClick={onClick}>Jouer la journée</GameButton>);
  fireEvent.click(screen.getByRole("button", { name: "Jouer la journée" }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("applies the gold variant's classes", () => {
  render(<GameButton variant="gold">Continuer</GameButton>);
  expect(screen.getByRole("button", { name: "Continuer" })).toHaveClass("bg-[#e9ab1f]");
});

test("renders a leading icon decoratively (not part of the accessible name)", () => {
  render(<GameButton icon="🏨">Aller à l'hôtel</GameButton>);
  const button = screen.getByRole("button", { name: "Aller à l'hôtel" });
  expect(button).toHaveTextContent("🏨");
});

test("disables the button and prevents clicks when disabled", () => {
  const onClick = jest.fn();
  render(<GameButton disabled onClick={onClick}>Indisponible</GameButton>);
  const button = screen.getByRole("button", { name: "Indisponible" });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
});
