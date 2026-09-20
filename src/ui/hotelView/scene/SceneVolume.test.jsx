import { render, screen, fireEvent } from "@testing-library/react";
import SceneVolume, { getInteractionFilter, INTERACTION_FILTERS } from "./SceneVolume";
import { buildPlatformShape } from "./sceneShapes";
import { worldToScreen, tileToWorld } from "../engine/IsoProjection";
import { SCENE_PROJECTION } from "./SceneTokens";

const COLORS = { top: "#ffffff", left: "#cccccc", right: "#999999" };

describe("SceneVolume", () => {
  it("positions and sizes itself from world coordinates, matching buildPlatformShape's own math", () => {
    const tile = { col: 2, row: 3 };
    const footprint = { width: 1, depth: 1, height: 1 };
    render(<SceneVolume tile={tile} footprint={footprint} colors={COLORS} />);
    const el = screen.getByTestId("scene-volume");

    const topCorner = worldToScreen(tileToWorld({ col: tile.col, row: tile.row, elevation: 0 }), SCENE_PROJECTION);
    const rightCorner = worldToScreen(tileToWorld({ col: tile.col + 1, row: tile.row, elevation: 0 }), SCENE_PROJECTION);
    const bottomCorner = worldToScreen(tileToWorld({ col: tile.col + 1, row: tile.row + 1, elevation: 0 }), SCENE_PROJECTION);
    const leftCorner = worldToScreen(tileToWorld({ col: tile.col, row: tile.row + 1, elevation: 0 }), SCENE_PROJECTION);
    const expected = buildPlatformShape(topCorner, rightCorner, bottomCorner, leftCorner, 64);

    expect(el.style.left).toBe(`${expected.originX}px`);
    expect(el.style.top).toBe(`${expected.originY}px`);
  });

  it("accepts a custom testId and extra data attributes", () => {
    render(<SceneVolume tile={{ col: 0, row: 0 }} footprint={{ width: 1, depth: 1, height: 1 }} colors={COLORS} testId="my-volume" dataAttrs={{ "data-kind": "wall" }} />);
    const el = screen.getByTestId("my-volume");
    expect(el.dataset.kind).toBe("wall");
  });

  it("forwards hover/click handlers", () => {
    const onMouseEnter = jest.fn();
    const onClick = jest.fn();
    render(<SceneVolume tile={{ col: 0, row: 0 }} footprint={{ width: 1, depth: 1, height: 1 }} colors={COLORS} onMouseEnter={onMouseEnter} onClick={onClick} />);
    const el = screen.getByTestId("scene-volume");
    fireEvent.mouseEnter(el);
    fireEvent.click(el);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("defaults to the 'default' interaction state, with no filter applied", () => {
    render(<SceneVolume tile={{ col: 0, row: 0 }} footprint={{ width: 1, depth: 1, height: 1 }} colors={COLORS} />);
    const el = screen.getByTestId("scene-volume");
    expect(el.dataset.state).toBe("default");
    expect(el.style.filter).toBe("none");
  });

  it.each(["hovered", "selected", "disabled"])("applies the shared %s filter, exposed via data-state", (state) => {
    render(<SceneVolume tile={{ col: 0, row: 0 }} footprint={{ width: 1, depth: 1, height: 1 }} colors={COLORS} interactionState={state} />);
    const el = screen.getByTestId("scene-volume");
    expect(el.dataset.state).toBe(state);
    expect(el.style.filter).toBe(getInteractionFilter(state));
    expect(el.style.filter).not.toBe("none");
  });

  it("getInteractionFilter falls back to 'default' for an unknown state", () => {
    expect(getInteractionFilter("not-a-real-state")).toBe(INTERACTION_FILTERS.default);
  });

  it("renders no ground-shadow element by default, and exactly one when groundShadow is set", () => {
    const { container: withoutShadow } = render(<SceneVolume tile={{ col: 0, row: 0 }} footprint={{ width: 1, depth: 1, height: 1 }} colors={COLORS} />);
    expect(withoutShadow.querySelectorAll('[aria-hidden="true"].rounded-full')).toHaveLength(0);

    const { container: withShadow } = render(<SceneVolume tile={{ col: 0, row: 0 }} footprint={{ width: 1, depth: 1, height: 1 }} colors={COLORS} groundShadow />);
    expect(withShadow.querySelectorAll('[aria-hidden="true"].rounded-full')).toHaveLength(1);
  });

  it("forwards title/ariaLabel for accessibility", () => {
    render(<SceneVolume tile={{ col: 0, row: 0 }} footprint={{ width: 1, depth: 1, height: 1 }} colors={COLORS} title="Un objet" ariaLabel="Un objet" />);
    const el = screen.getByTestId("scene-volume");
    expect(el).toHaveAttribute("title", "Un objet");
    expect(el).toHaveAttribute("aria-label", "Un objet");
  });
});
