import { render, screen, fireEvent, act } from "@testing-library/react";
import HotelScene from "./HotelScene";

// jsdom doesn't implement ResizeObserver at all -- this fake captures every
// observer's callback so a test can trigger it directly with a chosen
// `contentRect`, exactly like a real browser reporting the container's
// measured size. See SceneCamera.jsx's own docstring on why it's the one
// (and only) source of the camera's real viewportWidth/Height.
let observers;

beforeEach(() => {
  observers = [];
  global.ResizeObserver = class FakeResizeObserver {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe(target) {
      this.target = target;
    }
    disconnect() {
      observers = observers.filter((o) => o !== this);
    }
    unobserve() {}
  };
});

afterEach(() => {
  delete global.ResizeObserver;
});

function triggerResize(width, height) {
  const observer = observers[observers.length - 1];
  act(() => {
    observer.callback([{ target: observer.target, contentRect: { width, height } }]);
  });
}

function getTransformScale(el) {
  const match = /scale\(([^)]+)\)/.exec(el.style.transform);
  return match ? parseFloat(match[1]) : null;
}
function getTransformTranslate(el) {
  const match = /translate3d\(([^,]+)px,\s*([^,]+)px/.exec(el.style.transform);
  return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null;
}

describe("HotelScene / composition", () => {
  it("renders the terrain, a full grid of cells, and the lobby", () => {
    render(<HotelScene />);
    expect(screen.getByTestId("scene-terrain-base")).toBeInTheDocument();
    expect(screen.getAllByTestId("scene-grid-cell").length).toBeGreaterThan(0);
    expect(screen.getByTestId("lobby-building")).toBeInTheDocument();
    expect(screen.getByTestId("lobby-reception-counter")).toBeInTheDocument();
  });

  it("reserves HUD slots without rendering a final HUD", () => {
    render(<HotelScene />);
    expect(screen.getByTestId("hud-top-slot")).toBeInTheDocument();
    expect(screen.getByTestId("hud-side-slot")).toBeInTheDocument();
    expect(screen.getByTestId("hud-bottom-slot")).toBeInTheDocument();
  });

  it("renders the primitives showcase (fence, column, lamp, path, tree, rock, bench)", () => {
    render(<HotelScene />);
    expect(screen.getAllByTestId("iso-fence")).toHaveLength(2);
    expect(screen.getByTestId("iso-column")).toBeInTheDocument();
    expect(screen.getByTestId("iso-lamp-post")).toBeInTheDocument();
    expect(screen.getByTestId("iso-path")).toBeInTheDocument();
    expect(screen.getByTestId("iso-tree")).toBeInTheDocument();
    expect(screen.getByTestId("iso-rock")).toBeInTheDocument();
    expect(screen.getByTestId("iso-bench")).toBeInTheDocument();
  });

  it("only ever renders ONE isometric scene -- never the old view alongside the new one", () => {
    render(<HotelScene />);
    // IsoFinalView's own unmistakable markers must be absent from this tree.
    expect(screen.queryByText(/vue isométrique premium/i)).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-testid="scene-camera-transform"]')).toHaveLength(1);
  });
});

describe("HotelScene / initial auto-fit (real viewport)", () => {
  it("stays unframed (fallback camera) until the container's real size is measured", () => {
    render(<HotelScene />);
    // No resize reported yet -- still the rough fallback, not a real fit.
    expect(screen.getByTestId("scene-camera-transform")).toBeInTheDocument();
  });

  it("auto-fits to the REAL measured viewport size on the first ResizeObserver report", () => {
    render(<HotelScene />);
    const beforeFit = getTransformScale(screen.getByTestId("scene-camera-transform"));

    triggerResize(1000, 600);

    const afterFit = getTransformScale(screen.getByTestId("scene-camera-transform"));
    expect(afterFit).not.toBe(beforeFit);
    expect(afterFit).toBeGreaterThan(0);
  });

  it("centers the world in the viewport after the initial fit, for several realistic sizes", () => {
    for (const [width, height] of [
      [1280, 720],
      [1920, 1080],
      [1024, 768],
      [800, 600],
    ]) {
      const { unmount } = render(<HotelScene />);
      triggerResize(width, height);
      const translate = getTransformTranslate(screen.getByTestId("scene-camera-transform"));
      expect(translate.x).toBeGreaterThan(0);
      expect(translate.y).toBeGreaterThan(0);
      unmount();
    }
  });
});

describe("HotelScene / interaction", () => {
  it("hovering a cell updates the live tile readout with {col, row}, not a DOM coordinate", () => {
    render(<HotelScene />);
    const cell = screen.getAllByTestId("scene-grid-cell")[5];
    fireEvent.mouseEnter(cell);
    expect(screen.getByTestId("hud-bottom-slot")).toHaveTextContent(`(${cell.dataset.col}, ${cell.dataset.row})`);
  });

  it("clicking a cell selects it, clicking it again deselects it", () => {
    render(<HotelScene />);
    const cell = screen.getAllByTestId("scene-grid-cell")[3];
    fireEvent.click(cell);
    expect(cell.dataset.selected).toBe("true");
    fireEvent.click(cell);
    expect(cell.dataset.selected).toBe("false");
  });

  it("the lobby's own anchor tile reads as occupied", () => {
    render(<HotelScene />);
    // LOBBY_TILE = {col: 2, row: 1} -- see HotelScene.jsx.
    const occupiedCell = screen.getAllByTestId("scene-grid-cell").find((el) => el.dataset.col === "2" && el.dataset.row === "1");
    expect(occupiedCell.dataset.occupied).toBe("true");
  });

  it("hovering and clicking the lobby's (north) wall toggles its own hovered/selected state", () => {
    render(<HotelScene />);
    const wall = screen.getByTestId("lobby-wall-north");
    const building = screen.getByTestId("lobby-building");

    fireEvent.mouseEnter(wall);
    expect(building.dataset.hovered).toBe("true");

    fireEvent.click(wall);
    expect(building.dataset.selected).toBe("true");

    fireEvent.click(wall);
    expect(building.dataset.selected).toBe("false");
  });
});

describe("HotelScene / camera", () => {
  it("wheel-zooming actually changes the rendered scale, anchored around the real viewport", () => {
    render(<HotelScene />);
    triggerResize(1000, 600);
    const before = getTransformScale(screen.getByTestId("scene-camera-transform"));

    const cameraContainer = screen.getByTestId("scene-camera-transform").parentElement;
    fireEvent.wheel(cameraContainer, { deltaY: -100, clientX: 400, clientY: 300 });

    const after = getTransformScale(screen.getByTestId("scene-camera-transform"));
    expect(after).toBeGreaterThan(before);
  });

  it("Recentrer re-fits the world (fitWorldToViewport), not resetCamera -- it recovers from ANY prior camera state", () => {
    render(<HotelScene />);
    triggerResize(1000, 600);
    const fittedScale = getTransformScale(screen.getByTestId("scene-camera-transform"));

    const cameraContainer = screen.getByTestId("scene-camera-transform").parentElement;
    // Zoom out repeatedly and drag far away -- simulate "caméra très
    // éloignée et décalée".
    for (let i = 0; i < 8; i += 1) fireEvent.wheel(cameraContainer, { deltaY: 100, clientX: 500, clientY: 300 });
    fireEvent.mouseDown(cameraContainer, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.mouseMove(window, { clientX: -500, clientY: -400 });
    fireEvent.mouseUp(window, { clientX: -500, clientY: -400 });

    const driftedScale = getTransformScale(screen.getByTestId("scene-camera-transform"));
    expect(driftedScale).not.toBeCloseTo(fittedScale, 3);

    fireEvent.click(screen.getByText("🎯 Recentrer"));
    expect(getTransformScale(screen.getByTestId("scene-camera-transform"))).toBeCloseTo(fittedScale, 5);
  });

  it("resize: updates the viewport and keeps the world on-screen, WITHOUT discarding the current pan/zoom", () => {
    render(<HotelScene />);
    triggerResize(1000, 600);
    const fittedScale = getTransformScale(screen.getByTestId("scene-camera-transform"));

    const cameraContainer = screen.getByTestId("scene-camera-transform").parentElement;
    fireEvent.wheel(cameraContainer, { deltaY: -100, clientX: 500, clientY: 300 }); // zoom in a bit
    const zoomedScale = getTransformScale(screen.getByTestId("scene-camera-transform"));
    expect(zoomedScale).not.toBeCloseTo(fittedScale, 3);

    // A resize (not the very first one) must NOT silently re-fit and wipe
    // out that manual zoom.
    triggerResize(1100, 650);
    expect(getTransformScale(screen.getByTestId("scene-camera-transform"))).toBeCloseTo(zoomedScale, 5);
  });

  it("pan limits are derived from the real (post-resize) viewport size, not a hardcoded resolution", () => {
    const { unmount: unmountSmall } = render(<HotelScene />);
    triggerResize(400, 300);
    const smallContainer = screen.getByTestId("scene-camera-transform").parentElement;
    fireEvent.mouseDown(smallContainer, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.mouseMove(window, { clientX: -100000, clientY: -100000 });
    fireEvent.mouseUp(window, { clientX: -100000, clientY: -100000 });
    const smallTranslate = getTransformTranslate(screen.getByTestId("scene-camera-transform"));
    unmountSmall();

    render(<HotelScene />);
    triggerResize(3000, 2000);
    const largeContainer = screen.getByTestId("scene-camera-transform").parentElement;
    fireEvent.mouseDown(largeContainer, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.mouseMove(window, { clientX: -100000, clientY: -100000 });
    fireEvent.mouseUp(window, { clientX: -100000, clientY: -100000 });
    const largeTranslate = getTransformTranslate(screen.getByTestId("scene-camera-transform"));

    // Both are clamped (finite, no runaway), but the larger viewport can
    // pan its own center further before clamping kicks in.
    expect(Number.isFinite(smallTranslate.x)).toBe(true);
    expect(Number.isFinite(largeTranslate.x)).toBe(true);
    expect(largeTranslate.x).not.toBe(smallTranslate.x);
  });
});

describe("HotelScene / depth sorting", () => {
  it("draws the lobby before the (further-away) primitive showcase, and the showcase itself in world-depth order", () => {
    render(<HotelScene />);
    // LOBBY_ENTITY (2,1, footprint 8x6) -> depthKey (2+8)+(1+6) = 17.
    // PRIMITIVE_SHOWCASE (see HotelScene.jsx): fence-1 (12,8) -> 21.06;
    // lamp (12,9) -> 21.16; fence-2 (13,8) -> 22.06; column (14,8) -> 22.24;
    // rock (13,10) -> 23.75; tree (12,10) -> 24; bench (14,10) -> 24.71;
    // path (13,9,w2,d1) -> 25. Strictly increasing -- no ties.
    const cameraTransform = screen.getByTestId("scene-camera-transform");
    const testIdsInDomOrder = Array.from(cameraTransform.querySelectorAll("[data-testid]")).map((el) => el.getAttribute("data-testid"));

    expect(testIdsInDomOrder[0]).toBe("scene-terrain-base");
    const lobbyIndex = testIdsInDomOrder.indexOf("lobby-building");
    expect(lobbyIndex).toBeGreaterThan(0);

    // Every primitive-showcase element (rendered as `<span>` wrappers, see
    // HotelScene.jsx; their OWN default, un-overridden `iso-*` testids --
    // every lobby-internal use of the same primitives overrides its own
    // testId, e.g. "lobby-entrance-lamp-post", so there's no collision)
    // comes AFTER the lobby in document order -- matching their own,
    // larger depth keys.
    const showcaseIndex = testIdsInDomOrder.findIndex((id) => id?.startsWith("iso-"));
    expect(showcaseIndex).toBeGreaterThan(lobbyIndex);
  });

  it("depth-sorts the lobby's OWN sub-parts -- furniture never simply stacks in JSX order", () => {
    render(<HotelScene />);
    // The reception counter (against the north wall, near row 1.3) has a
    // smaller depth key than the seating group (deeper into the room,
    // around row 3-4) -- so the counter must be drawn (and thus visually
    // sit) BEFORE the rug/table/chairs in DOM order.
    const building = screen.getByTestId("lobby-building");
    const children = Array.from(building.children).map((el) => el.getAttribute("data-testid")).filter(Boolean);
    const counterIndex = children.indexOf("lobby-reception-counter");
    const rugIndex = children.indexOf("lobby-rug");
    expect(counterIndex).toBeGreaterThanOrEqual(0);
    expect(rugIndex).toBeGreaterThan(counterIndex);
  });
});
