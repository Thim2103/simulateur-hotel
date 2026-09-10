import { useCallback, useEffect, useRef, useState } from "react";
import { panByScreenDelta, zoomAtViewportPoint, getViewportTransform } from "../engine/Camera";

// A pixel movement smaller than this still counts as a click, not a drag
// -- lets a real click through untouched while still catching every real
// pan gesture.
const DRAG_THRESHOLD_PX = 4;
const ZOOM_IN_FACTOR = 1.1;
const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

// The one place that turns raw mouse/wheel DOM events into
// engine/Camera.js calls, and applies the resulting camera as a single CSS
// `transform` on a wrapper around its (unchanged) children. It knows only
// the camera and the scene's iso projection params -- NOT rooms, guests,
// staff, revenue, or anything else this scene happens to be showing (see
// this file's own props: `camera`, `onCameraChange`, `projectionParams`,
// `children` -- nothing hotel-shaped).
//
// Interaction model: left-click + drag to pan, wheel to zoom (anchored on
// the cursor). Every DOM listener this component ever adds is either
// scoped to its own container (the wheel listener, for its whole mounted
// lifetime -- needed non-passively so it can `preventDefault()` the
// page's own scroll/zoom) or added to `window` ONLY while a drag is
// actually in progress and removed the moment it ends (pointer up, or
// unmount mid-drag) -- never a permanent global listener.
//
// Rendering stays cheap when only the camera changes: children keep being
// positioned exactly as they always were (via IsoProjection.worldToScreen,
// camera-unaware); this component only ever recomputes ONE
// `translate3d(...) scale(...)` string (Camera.getViewportTransform()) and
// hands it to a single wrapper `<div>` -- the browser's own compositor
// does the actual panning/zooming, no entity ever gets re-projected
// because the camera moved.
export default function SceneCamera({ camera, onCameraChange, projectionParams, className = "", style, children }) {
  const containerRef = useRef(null);
  const dragRef = useRef(null); // { startX, startY, lastX, lastY, moved } while a drag is live
  const activeListenersRef = useRef(null); // { move, up } while attached to window
  // A real browser fires a `click` right after `mouseup`, even one ending
  // a drag -- by then `dragRef.current` is already cleared, so whether
  // that trailing click should be swallowed has to survive past mouseup.
  // Set once in handleMouseUp, consumed (reset) by the very next
  // handleClickCapture so it never swallows a LATER, unrelated click.
  const justDraggedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  // Wheel-to-zoom: a non-passive listener for the component's whole
  // mounted lifetime (wheel needs `preventDefault()`, which a passive
  // listener -- what React's own synthetic onWheel now defaults to --
  // cannot do), removed on unmount.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    function handleWheel(event) {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const viewportPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const factor = event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;
      onCameraChange((current) => zoomAtViewportPoint(current, viewportPoint, factor, projectionParams));
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [onCameraChange, projectionParams]);

  // Safety net: if this component unmounts mid-drag, drop whatever
  // window-level listeners a pointer-down attached rather than leaking
  // them.
  useEffect(() => {
    return () => {
      if (activeListenersRef.current) {
        window.removeEventListener("mousemove", activeListenersRef.current.move);
        window.removeEventListener("mouseup", activeListenersRef.current.up);
        activeListenersRef.current = null;
      }
    };
  }, []);

  const handleMouseDown = useCallback(
    (event) => {
      if (event.button !== 0) return; // left button only
      event.preventDefault(); // don't let a drag start a native text/image selection

      dragRef.current = { startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false };

      function handleMouseMove(moveEvent) {
        const drag = dragRef.current;
        if (!drag) return;

        if (!drag.moved) {
          const totalDx = moveEvent.clientX - drag.startX;
          const totalDy = moveEvent.clientY - drag.startY;
          if (Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD_PX) return; // still just a click, so far
          drag.moved = true;
          setIsDragging(true);
        }

        const dx = moveEvent.clientX - drag.lastX;
        const dy = moveEvent.clientY - drag.lastY;
        drag.lastX = moveEvent.clientX;
        drag.lastY = moveEvent.clientY;
        onCameraChange((current) => panByScreenDelta(current, dx, dy, projectionParams));
      }

      function handleMouseUp() {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        activeListenersRef.current = null;
        justDraggedRef.current = dragRef.current?.moved ?? false;
        dragRef.current = null;
        setIsDragging(false);
      }

      activeListenersRef.current = { move: handleMouseMove, up: handleMouseUp };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [onCameraChange, projectionParams]
  );

  // Swallows the click that follows a real drag (mouseup always fires a
  // click right after it) so nothing downstream mistakes "I just panned
  // the camera" for "I clicked this room" -- no object selection during a
  // drag. Consumes the flag so only that ONE trailing click is swallowed,
  // never a later, genuine one.
  const handleClickCapture = useCallback((event) => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      event.stopPropagation();
      event.preventDefault();
    }
  }, []);

  const transform = getViewportTransform(camera, projectionParams);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ ...style, cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
      onMouseDown={handleMouseDown}
      onClickCapture={handleClickCapture}
    >
      <div
        style={{
          transform: `translate3d(${transform.translateX}px, ${transform.translateY}px, 0) scale(${transform.zoom})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
