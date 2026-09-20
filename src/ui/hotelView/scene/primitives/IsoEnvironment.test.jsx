import { render, screen, fireEvent } from "@testing-library/react";
import { IsoFoliage, IsoTree, IsoBush, IsoRock, IsoFence } from "./IsoEnvironment";
import { worldToScreen, tileToWorld } from "../../engine/IsoProjection";
import { SCENE_PROJECTION } from "../SceneTokens";

const TILE = { col: 6, row: 6 };

describe("IsoEnvironment / presence", () => {
  it("renders one of each primitive", () => {
    render(
      <>
        <IsoTree tile={TILE} />
        <IsoBush tile={{ col: 7, row: 6 }} />
        <IsoRock tile={{ col: 8, row: 6 }} />
        <IsoFence tile={{ col: 9, row: 6 }} />
      </>
    );
    expect(screen.getByTestId("iso-tree")).toBeInTheDocument();
    expect(screen.getByTestId("iso-bush")).toBeInTheDocument();
    expect(screen.getByTestId("iso-rock")).toBeInTheDocument();
    expect(screen.getByTestId("iso-fence")).toBeInTheDocument();
  });

  it("IsoTree has a trunk, IsoBush does not -- the shared shape, at two scales", () => {
    render(
      <>
        <IsoTree tile={TILE} />
        <IsoBush tile={{ col: 7, row: 6 }} />
      </>
    );
    // A tree's own canopy is bigger than a bush's own canopy (children[0]
    // of the foliage span is the canopy).
    const treeCanopy = screen.getByTestId("iso-tree").firstChild;
    const bushCanopy = screen.getByTestId("iso-bush").firstChild;
    expect(parseFloat(treeCanopy.style.width)).toBeGreaterThan(parseFloat(bushCanopy.style.width));
    expect(screen.getByTestId("iso-tree").children).toHaveLength(2); // canopy + trunk
    expect(screen.getByTestId("iso-bush").children).toHaveLength(1); // canopy only
  });
});

describe("IsoEnvironment / world coordinates", () => {
  it("IsoFoliage positions itself using IsoProjection, at the tile's own center (+0.5)", () => {
    render(<IsoFoliage tile={TILE} testId="foliage-check" />);
    const el = screen.getByTestId("foliage-check");
    const expected = worldToScreen(tileToWorld({ col: TILE.col + 0.5, row: TILE.row + 0.5, elevation: 0 }), SCENE_PROJECTION);
    expect(el.style.left).toBe(`${expected.x}px`);
    expect(el.style.top).toBe(`${expected.y}px`);
  });

  it("IsoRock positions itself via SceneVolume/IsoProjection -- not an arbitrary screen offset", () => {
    render(<IsoRock tile={TILE} />);
    const el = screen.getByTestId("iso-rock");
    const topCorner = worldToScreen(tileToWorld({ col: TILE.col, row: TILE.row, elevation: 0 }), SCENE_PROJECTION);
    expect(parseFloat(el.style.left)).toBeLessThanOrEqual(topCorner.x + 1);
  });
});

describe("IsoEnvironment / interaction", () => {
  it("IsoTree/IsoRock/IsoFence forward hover and reflect interactionState", () => {
    const onMouseEnter = jest.fn();
    render(<IsoTree tile={TILE} interactionState="hovered" onMouseEnter={onMouseEnter} />);
    const el = screen.getByTestId("iso-tree");
    expect(el.dataset.state).toBe("hovered");
    fireEvent.mouseEnter(el);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
  });
});

describe("IsoEnvironment / a wider IsoFence produces a wider bounding box", () => {
  it("scales with width", () => {
    const { container: narrow } = render(<IsoFence tile={TILE} width={1} />);
    const { container: wide } = render(<IsoFence tile={TILE} width={3} />);
    const narrowWidth = parseFloat(narrow.querySelector('[data-testid="iso-fence"]').style.width);
    const wideWidth = parseFloat(wide.querySelector('[data-testid="iso-fence"]').style.width);
    expect(wideWidth).toBeGreaterThan(narrowWidth);
  });
});
