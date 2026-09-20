import { render, screen } from "@testing-library/react";
import SceneTerrainBase from "./SceneTerrainBase";
import { buildPlatformShape } from "./sceneShapes";
import { worldToScreen, tileToWorld } from "../engine/IsoProjection";
import { SCENE_PROJECTION, TERRAIN_DEPTH } from "./SceneTokens";

const BOUNDS = { minCol: 0, maxCol: 5, minRow: 0, maxRow: 3 };

function expectedShape() {
  const topCorner = worldToScreen(tileToWorld({ col: BOUNDS.minCol, row: BOUNDS.minRow }), SCENE_PROJECTION);
  const rightCorner = worldToScreen(tileToWorld({ col: BOUNDS.maxCol, row: BOUNDS.minRow }), SCENE_PROJECTION);
  const bottomCorner = worldToScreen(tileToWorld({ col: BOUNDS.maxCol, row: BOUNDS.maxRow }), SCENE_PROJECTION);
  const leftCorner = worldToScreen(tileToWorld({ col: BOUNDS.minCol, row: BOUNDS.maxRow }), SCENE_PROJECTION);
  return buildPlatformShape(topCorner, rightCorner, bottomCorner, leftCorner, TERRAIN_DEPTH);
}

describe("SceneTerrainBase", () => {
  it("renders one terrain platform", () => {
    render(<SceneTerrainBase bounds={BOUNDS} />);
    expect(screen.getByTestId("scene-terrain-base")).toBeInTheDocument();
  });

  it("sizes and positions itself using IsoProjection -- exactly the shared engine math, not a local formula", () => {
    render(<SceneTerrainBase bounds={BOUNDS} />);
    const el = screen.getByTestId("scene-terrain-base");
    const expected = expectedShape();
    expect(el.style.left).toBe(`${expected.originX}px`);
    expect(el.style.top).toBe(`${expected.originY}px`);
    expect(el.style.width).toBe(`${expected.width}px`);
    expect(el.style.height).toBe(`${expected.height}px`);
  });

  it("a wider bounds rectangle produces a wider terrain", () => {
    const { container: narrow } = render(<SceneTerrainBase bounds={{ minCol: 0, maxCol: 2, minRow: 0, maxRow: 2 }} />);
    const { container: wide } = render(<SceneTerrainBase bounds={{ minCol: 0, maxCol: 20, minRow: 0, maxRow: 2 }} />);
    const narrowWidth = parseFloat(narrow.querySelector('[data-testid="scene-terrain-base"]').style.width);
    const wideWidth = parseFloat(wide.querySelector('[data-testid="scene-terrain-base"]').style.width);
    expect(wideWidth).toBeGreaterThan(narrowWidth);
  });
});
