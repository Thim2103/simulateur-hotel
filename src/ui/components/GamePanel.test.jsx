import { render, screen } from "@testing-library/react";
import GamePanel from "./GamePanel";

test("renders a title, optional actions slot and children", () => {
  render(
    <GamePanel title="Décisions du jour" actions={<button type="button">Tout appliquer</button>}>
      <p>Contenu du panneau</p>
    </GamePanel>
  );
  expect(screen.getByRole("heading", { name: "Décisions du jour" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Tout appliquer" })).toBeInTheDocument();
  expect(screen.getByText("Contenu du panneau")).toBeInTheDocument();
});

test("renders without a header when no title/actions are given", () => {
  render(<GamePanel>Juste du contenu</GamePanel>);
  expect(screen.queryByRole("heading")).not.toBeInTheDocument();
});
