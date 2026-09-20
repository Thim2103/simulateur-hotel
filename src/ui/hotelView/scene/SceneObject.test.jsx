import { render, screen } from "@testing-library/react";
import SceneObject from "./SceneObject";
import { buildPlatformShape } from "./sceneShapes";
import { worldToScreen, tileToWorld } from "../engine/IsoProjection";
import { SCENE_PROJECTION, ELEVATION_HEIGHT } from "./SceneTokens";

describe("SceneObject / primitives", () => {
  it.each(["blockLow", "blockHigh", "blockWide"])("renders a %s block", (variant) => {
    render(<SceneObject tile={{ col: 1, row: 1 }} footprint={{ width: 1, depth: 1, height: 1 }} variant={variant} />);
    const el = screen.getByTestId("scene-object");
    expect(el.dataset.variant).toBe(variant);
  });

  it("renders a stylized tree", () => {
    render(<SceneObject tile={{ col: 1, row: 1 }} variant="tree" />);
    expect(screen.getByTestId("scene-object").dataset.variant).toBe("tree");
  });
});

describe("SceneObject / world coordinates", () => {
  it("positions a block using IsoProjection, matching buildPlatformShape's own math exactly -- not an arbitrary screen offset", () => {
    const tile = { col: 4, row: 2 };
    const footprint = { width: 1, depth: 1, height: 1 };
    render(<SceneObject tile={tile} footprint={footprint} variant="blockLow" />);
    const el = screen.getByTestId("scene-object");

    const topCorner = worldToScreen(tileToWorld({ col: tile.col, row: tile.row, elevation: 0 }), SCENE_PROJECTION);
    const rightCorner = worldToScreen(tileToWorld({ col: tile.col + footprint.width, row: tile.row, elevation: 0 }), SCENE_PROJECTION);
    const bottomCorner = worldToScreen(tileToWorld({ col: tile.col + footprint.width, row: tile.row + footprint.depth, elevation: 0 }), SCENE_PROJECTION);
    const leftCorner = worldToScreen(tileToWorld({ col: tile.col, row: tile.row + footprint.depth, elevation: 0 }), SCENE_PROJECTION);
    const expected = buildPlatformShape(topCorner, rightCorner, bottomCorner, leftCorner, footprint.height * ELEVATION_HEIGHT);

    expect(el.style.left).toBe(`${expected.originX}px`);
    expect(el.style.top).toBe(`${expected.originY}px`);
    expect(el.style.width).toBe(`${expected.width}px`);
    expect(el.style.height).toBe(`${expected.height}px`);
  });

  it("a higher elevation raises the object visually (smaller screen Y) at the same tile", () => {
    const { container: ground } = render(<SceneObject tile={{ col: 1, row: 1 }} elevation={0} footprint={{ width: 1, depth: 1, height: 1 }} variant="blockLow" />);
    const { container: raised } = render(<SceneObject tile={{ col: 1, row: 1 }} elevation={2} footprint={{ width: 1, depth: 1, height: 1 }} variant="blockLow" />);
    const groundTop = parseFloat(ground.querySelector('[data-testid="scene-object"]').style.top);
    const raisedTop = parseFloat(raised.querySelector('[data-testid="scene-object"]').style.top);
    expect(raisedTop).toBeLessThan(groundTop);
    // The rise must match ELEVATION_HEIGHT exactly (2 world Z units).
    expect(groundTop - raisedTop).toBeCloseTo(2 * ELEVATION_HEIGHT, 5);
  });

  it("a taller block has a taller bounding box than a shorter one at the same footprint", () => {
    const { container: low } = render(<SceneObject tile={{ col: 1, row: 1 }} footprint={{ width: 1, depth: 1, height: 1 }} variant="blockLow" />);
    const { container: high } = render(<SceneObject tile={{ col: 1, row: 1 }} footprint={{ width: 1, depth: 1, height: 3 }} variant="blockHigh" />);
    const lowHeight = parseFloat(low.querySelector('[data-testid="scene-object"]').style.height);
    const highHeight = parseFloat(high.querySelector('[data-testid="scene-object"]').style.height);
    expect(highHeight).toBeGreaterThan(lowHeight);
  });

  it("a wider footprint produces a wider bounding box", () => {
    const { container: narrow } = render(<SceneObject tile={{ col: 1, row: 1 }} footprint={{ width: 1, depth: 1, height: 1 }} variant="blockWide" />);
    const { container: wide } = render(<SceneObject tile={{ col: 1, row: 1 }} footprint={{ width: 3, depth: 1, height: 1 }} variant="blockWide" />);
    const narrowWidth = parseFloat(narrow.querySelector('[data-testid="scene-object"]').style.width);
    const wideWidth = parseFloat(wide.querySelector('[data-testid="scene-object"]').style.width);
    expect(wideWidth).toBeGreaterThan(narrowWidth);
  });
});
