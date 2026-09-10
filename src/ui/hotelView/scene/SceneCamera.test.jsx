import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SceneCamera from "./SceneCamera";
import { createCamera } from "../engine/Camera";

const PARAMS = { tileWidth: 2, tileHeight: 2, elevationHeight: 2, originX: 0, originY: 0, scale: 1 };

function Harness({ initialCamera, onCameraSnapshot, onRoomClick }) {
  const [camera, setCamera] = useState(initialCamera);
  const handleChange = (updater) => {
    setCamera((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      onCameraSnapshot?.(next);
      return next;
    });
  };
  return (
    <SceneCamera camera={camera} onCameraChange={handleChange} projectionParams={PARAMS}>
      <button onClick={onRoomClick}>Chambre 105</button>
    </SceneCamera>
  );
}

function renderHarness(overrides = {}) {
  const snapshots = [];
  const onRoomClick = jest.fn();
  const initialCamera = createCamera({ x: 0, y: 0, zoom: 1, viewportWidth: 800, viewportHeight: 600, ...overrides });
  render(<Harness initialCamera={initialCamera} onCameraSnapshot={(c) => snapshots.push(c)} onRoomClick={onRoomClick} />);
  const container = screen.getByText("Chambre 105").closest("div");
  return { snapshots, onRoomClick, container };
}

describe("SceneCamera / wheel", () => {
  it("zooms in on scroll-up (negative deltaY)", () => {
    const { snapshots, container } = renderHarness();
    fireEvent.wheel(container, { deltaY: -100, clientX: 400, clientY: 300 });
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].zoom).toBeGreaterThan(1);
  });

  it("zooms out on scroll-down (positive deltaY)", () => {
    const { snapshots, container } = renderHarness();
    fireEvent.wheel(container, { deltaY: 100, clientX: 400, clientY: 300 });
    expect(snapshots[0].zoom).toBeLessThan(1);
  });
});

describe("SceneCamera / drag", () => {
  it("a mousedown + mousemove past the threshold pans the camera", () => {
    const { snapshots, container } = renderHarness();
    fireEvent.mouseDown(container, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 130, clientY: 90 }); // 30/-10px, past the threshold
    expect(snapshots.length).toBeGreaterThan(0);
    const last = snapshots[snapshots.length - 1];
    expect(last.x !== 0 || last.y !== 0).toBe(true);
  });

  it("a tiny mousemove under the threshold does not pan (stays a click)", () => {
    const { snapshots, container } = renderHarness();
    fireEvent.mouseDown(container, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 101, clientY: 100 }); // 1px, under DRAG_THRESHOLD_PX
    expect(snapshots).toHaveLength(0);
  });

  it("ignores a right-button mousedown (left-button drag only)", () => {
    const { snapshots, container } = renderHarness();
    fireEvent.mouseDown(container, { button: 2, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
    expect(snapshots).toHaveLength(0);
  });
});

describe("SceneCamera / pointer release and cleanup", () => {
  it("mouseup stops the drag: further mousemove no longer pans", () => {
    const { snapshots, container } = renderHarness();
    fireEvent.mouseDown(container, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 150, clientY: 100 });
    const countAfterDrag = snapshots.length;

    fireEvent.mouseUp(window, { clientX: 150, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 400, clientY: 400 }); // no drag active anymore
    expect(snapshots).toHaveLength(countAfterDrag);
  });

  it("removes its window listeners on unmount, even mid-drag", () => {
    const removeSpy = jest.spyOn(window, "removeEventListener");
    const addSpy = jest.spyOn(window, "addEventListener");
    const initialCamera = createCamera({ viewportWidth: 800, viewportHeight: 600 });
    const { unmount } = render(<Harness initialCamera={initialCamera} />);
    const container = screen.getByText("Chambre 105").closest("div");

    fireEvent.mouseDown(container, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.mouseMove(window, { clientX: 50, clientY: 50 }); // drag now active, window listeners attached
    const addedMove = addSpy.mock.calls.some(([type]) => type === "mousemove");
    expect(addedMove).toBe(true);

    unmount();
    const removedMove = removeSpy.mock.calls.some(([type]) => type === "mousemove");
    const removedUp = removeSpy.mock.calls.some(([type]) => type === "mouseup");
    expect(removedMove).toBe(true);
    expect(removedUp).toBe(true);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("removes its wheel listener on unmount", () => {
    const container_ = document.createElement("div");
    document.body.appendChild(container_);
    const initialCamera = createCamera({ viewportWidth: 800, viewportHeight: 600 });
    const { unmount, container } = render(<Harness initialCamera={initialCamera} />, { container: container_ });
    const removeSpy = jest.spyOn(container.firstChild, "removeEventListener");
    unmount();
    expect(removeSpy.mock.calls.some(([type]) => type === "wheel")).toBe(true);
  });
});

describe("SceneCamera / click vs drag", () => {
  it("a plain click (no drag) reaches the child normally", () => {
    const { onRoomClick, container } = renderHarness();
    fireEvent.mouseDown(container, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseUp(window, { clientX: 100, clientY: 100 });
    fireEvent.click(screen.getByText("Chambre 105"));
    expect(onRoomClick).toHaveBeenCalledTimes(1);
  });

  it("a real drag swallows the click that follows it -- no accidental selection", () => {
    const { onRoomClick, container } = renderHarness();
    fireEvent.mouseDown(container, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 200, clientY: 100 }); // well past the threshold
    fireEvent.mouseUp(window, { clientX: 200, clientY: 100 });
    // A real browser fires a click right after mouseup even when it ends a
    // drag -- simulate that and confirm it never reaches the child.
    fireEvent.click(screen.getByText("Chambre 105"));
    expect(onRoomClick).not.toHaveBeenCalled();
  });
});
