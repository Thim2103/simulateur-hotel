import { render } from "@testing-library/react";
import RetroGrid, { toIsoRetro, depthSortRetro, TILE_WIDTH, TILE_HEIGHT } from "./RetroGrid";

test("toIsoRetro projects grid coordinates using x-y, (x+y)/2 scaled to the tile size", () => {
  expect(toIsoRetro(0, 0)).toEqual({ x: 0, y: 0 });
  expect(toIsoRetro(1, 0)).toEqual({ x: TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
  expect(toIsoRetro(0, 1)).toEqual({ x: -TILE_WIDTH / 2, y: TILE_HEIGHT / 2 });
});

test("depthSortRetro draws far tiles first, near tiles last", () => {
  const items = [
    { id: "near", col: 3, row: 3 },
    { id: "far", col: 0, row: 0 },
    { id: "mid", col: 1, row: 1 },
  ];
  expect(depthSortRetro(items).map((i) => i.id)).toEqual(["far", "mid", "near"]);
});

test("depthSortRetro never mutates its input", () => {
  const items = [{ id: "a", col: 1, row: 0 }, { id: "b", col: 0, row: 1 }];
  depthSortRetro(items);
  expect(items).toEqual([{ id: "a", col: 1, row: 0 }, { id: "b", col: 0, row: 1 }]);
});

test("renders its children inside the stylised stage", () => {
  const { getByText } = render(
    <RetroGrid>
      <span>Contenu</span>
    </RetroGrid>
  );
  expect(getByText("Contenu")).toBeInTheDocument();
});
