import { render } from "@testing-library/react";
import IsoFinalGrid, { toIsoFinal, depthSortFinal, TILE_WIDTH, TILE_HEIGHT } from "./IsoFinalGrid";

test("toIsoFinal projects grid coordinates using x-y, (x+y)/2 scaled to the tile size", () => {
  expect(toIsoFinal(0, 0)).toEqual({ x: 0, y: 0 });
  expect(toIsoFinal(1, 0)).toEqual({ x: TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
  expect(toIsoFinal(0, 1)).toEqual({ x: -TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
});

test("depthSortFinal draws far tiles first, near tiles last", () => {
  const items = [{ id: "near", col: 3, row: 3 }, { id: "far", col: 0, row: 0 }, { id: "mid", col: 1, row: 1 }];
  expect(depthSortFinal(items).map((i) => i.id)).toEqual(["far", "mid", "near"]);
});

test("depthSortFinal never mutates its input", () => {
  const items = [{ id: "a", col: 1, row: 0 }, { id: "b", col: 0, row: 1 }];
  depthSortFinal(items);
  expect(items).toEqual([{ id: "a", col: 1, row: 0 }, { id: "b", col: 0, row: 1 }]);
});

test("renders its children inside the stage", () => {
  const { getByText } = render(
    <IsoFinalGrid>
      <span>Contenu</span>
    </IsoFinalGrid>
  );
  expect(getByText("Contenu")).toBeInTheDocument();
});
