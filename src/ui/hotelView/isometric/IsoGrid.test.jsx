import { render } from "@testing-library/react";
import IsoGrid, { toIso, depthSort, TILE_WIDTH, TILE_HEIGHT } from "./IsoGrid";

test("toIso projects grid coordinates using x-y, (x+y)/2 scaled to the tile size", () => {
  expect(toIso(0, 0)).toEqual({ x: 0, y: 0 });
  expect(toIso(1, 0)).toEqual({ x: TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
  expect(toIso(0, 1)).toEqual({ x: -TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
  expect(toIso(2, 1)).toEqual({ x: (2 - 1) * (TILE_WIDTH / 2), y: (2 + 1) * (TILE_HEIGHT / 2) });
});

test("depthSort draws far tiles first, near tiles last (painter's algorithm)", () => {
  const items = [
    { id: "near", col: 3, row: 3 },
    { id: "far", col: 0, row: 0 },
    { id: "mid", col: 1, row: 1 },
  ];
  expect(depthSort(items).map((i) => i.id)).toEqual(["far", "mid", "near"]);
});

test("depthSort never mutates its input and is stable for equal depth", () => {
  const items = [
    { id: "a", col: 1, row: 0 },
    { id: "b", col: 0, row: 1 },
  ];
  const sorted = depthSort(items);
  expect(items).toEqual([
    { id: "a", col: 1, row: 0 },
    { id: "b", col: 0, row: 1 },
  ]);
  expect(sorted.map((i) => i.id)).toEqual(["a", "b"]);
});

test("renders its children inside the isometric stage", () => {
  const { getByText } = render(
    <IsoGrid>
      <span>Contenu</span>
    </IsoGrid>
  );
  expect(getByText("Contenu")).toBeInTheDocument();
});
