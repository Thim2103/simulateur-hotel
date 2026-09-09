import { render, screen } from "@testing-library/react";
import IsoFinalIncident from "./IsoFinalIncident";

test("shows the right glyph for each incident type", () => {
  const { rerender } = render(<IsoFinalIncident col={0} row={0} type="fire" message="Départ de feu en cuisine." />);
  expect(screen.getByTitle("Départ de feu en cuisine.")).toHaveTextContent("🔥");

  rerender(<IsoFinalIncident col={0} row={0} type="noise" message="Plainte pour nuisances sonores." />);
  expect(screen.getByTitle("Plainte pour nuisances sonores.")).toHaveTextContent("📢");
});

test("defaults to the breakdown glyph for an unknown type", () => {
  render(<IsoFinalIncident col={0} row={0} type="unknown" message="Incident générique." />);
  expect(screen.getByTitle("Incident générique.")).toHaveTextContent("⚡");
});
