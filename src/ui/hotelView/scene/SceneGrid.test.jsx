import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SceneGrid, { tileKey } from "./SceneGrid";
import { worldToScreen, tileToWorld } from "../engine/IsoProjection";
import { SCENE_PROJECTION, TILE_WIDTH, TILE_HEIGHT } from "./SceneTokens";

const BOUNDS = { minCol: 0, maxCol: 2, minRow: 0, maxRow: 1 }; // 3 x 2 = 6 cells

describe("SceneGrid / generation", () => {
  it("generates exactly one cell per tile in bounds", () => {
    render(<SceneGrid bounds={BOUNDS} />);
    expect(screen.getAllByTestId("scene-grid-cell")).toHaveLength(6);
  });

  it("each cell carries its own {col, row} identity, not a DOM coordinate", () => {
    render(<SceneGrid bounds={BOUNDS} />);
    const cells = screen.getAllByTestId("scene-grid-cell");
    const identities = cells.map((cell) => `${cell.dataset.col},${cell.dataset.row}`);
    expect(new Set(identities).size).toBe(6);
    expect(identities).toContain("0,0");
    expect(identities).toContain("2,1");
  });
});

describe("SceneGrid / projection", () => {
  it("positions each cell using IsoProjection.worldToScreen (via SCENE_PROJECTION), centered on the tile", () => {
    render(<SceneGrid bounds={BOUNDS} />);
    const cell = screen.getAllByTestId("scene-grid-cell").find((el) => el.dataset.col === "1" && el.dataset.row === "1");
    const expectedScreen = worldToScreen(tileToWorld({ col: 1, row: 1 }), SCENE_PROJECTION);
    expect(cell.style.left).toBe(`${expectedScreen.x - TILE_WIDTH / 2}px`);
    expect(cell.style.top).toBe(`${expectedScreen.y - TILE_HEIGHT / 2}px`);
  });
});

describe("SceneGrid / hover", () => {
  it("reports the hovered tile as {col, row} on mouseEnter, and null on mouseLeave", () => {
    const onHoverTile = jest.fn();
    render(<SceneGrid bounds={BOUNDS} onHoverTile={onHoverTile} />);
    const cell = screen.getAllByTestId("scene-grid-cell").find((el) => el.dataset.col === "2" && el.dataset.row === "0");
    fireEvent.mouseEnter(cell);
    expect(onHoverTile).toHaveBeenCalledWith({ col: 2, row: 0 });
    fireEvent.mouseLeave(cell);
    expect(onHoverTile).toHaveBeenLastCalledWith(null);
  });

  it("marks the hovered cell's own data-hovered attribute", () => {
    render(<SceneGrid bounds={BOUNDS} hoveredTile={{ col: 1, row: 0 }} />);
    const hovered = screen.getAllByTestId("scene-grid-cell").find((el) => el.dataset.col === "1" && el.dataset.row === "0");
    const other = screen.getAllByTestId("scene-grid-cell").find((el) => el.dataset.col === "0" && el.dataset.row === "0");
    expect(hovered.dataset.hovered).toBe("true");
    expect(other.dataset.hovered).toBe("false");
  });
});

describe("SceneGrid / selection", () => {
  it("reports the clicked tile as {col, row}", () => {
    const onSelectTile = jest.fn();
    render(<SceneGrid bounds={BOUNDS} onSelectTile={onSelectTile} />);
    const cell = screen.getAllByTestId("scene-grid-cell").find((el) => el.dataset.col === "0" && el.dataset.row === "1");
    fireEvent.click(cell);
    expect(onSelectTile).toHaveBeenCalledWith({ col: 0, row: 1 });
  });

  it("marks the selected cell's own data-selected attribute", () => {
    render(<SceneGrid bounds={BOUNDS} selectedTile={{ col: 2, row: 1 }} />);
    const selected = screen.getAllByTestId("scene-grid-cell").find((el) => el.dataset.col === "2" && el.dataset.row === "1");
    expect(selected.dataset.selected).toBe("true");
  });

  it("a full select/deselect cycle (as a consumer like HotelScene would wire it)", () => {
    function Harness() {
      const [selected, setSelected] = useState(null);
      return (
        <SceneGrid
          bounds={BOUNDS}
          selectedTile={selected}
          onSelectTile={(tile) => setSelected((current) => (current?.col === tile.col && current?.row === tile.row ? null : tile))}
        />
      );
    }
    render(<Harness />);
    const getCell = () => screen.getAllByTestId("scene-grid-cell").find((el) => el.dataset.col === "1" && el.dataset.row === "0");

    fireEvent.click(getCell());
    expect(getCell().dataset.selected).toBe("true");
    fireEvent.click(getCell());
    expect(getCell().dataset.selected).toBe("false");
  });
});

describe("SceneGrid / occupied", () => {
  it("marks a tile occupied when its key is present in occupiedTiles", () => {
    const occupiedTiles = new Set([tileKey(1, 1)]);
    render(<SceneGrid bounds={BOUNDS} occupiedTiles={occupiedTiles} />);
    const occupied = screen.getAllByTestId("scene-grid-cell").find((el) => el.dataset.col === "1" && el.dataset.row === "1");
    const free = screen.getAllByTestId("scene-grid-cell").find((el) => el.dataset.col === "0" && el.dataset.row === "0");
    expect(occupied.dataset.occupied).toBe("true");
    expect(free.dataset.occupied).toBe("false");
  });
});
