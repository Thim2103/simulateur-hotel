import { render, screen } from "@testing-library/react";
import GameCard from "./GameCard";

test("renders title, description, icon and children", () => {
  render(
    <GameCard title="Occupation" description="Chambres vendues aujourd'hui" icon="🛏️">
      <p>90%</p>
    </GameCard>
  );
  expect(screen.getByRole("heading", { name: "Occupation" })).toBeInTheDocument();
  expect(screen.getByText("Chambres vendues aujourd'hui")).toBeInTheDocument();
  expect(screen.getByText("90%")).toBeInTheDocument();
});

test("applies the gold accent border when accent is true", () => {
  const { container } = render(<GameCard accent>Contenu</GameCard>);
  expect(container.firstChild).toHaveClass("border-l-[#e9ab1f]");
});

test("renders without a heading when no title is given", () => {
  render(<GameCard>Contenu seul</GameCard>);
  expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  expect(screen.getByText("Contenu seul")).toBeInTheDocument();
});
